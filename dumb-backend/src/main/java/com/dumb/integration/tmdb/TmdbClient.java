package com.dumb.integration.tmdb;

import com.dumb.common.enums.ResultCodeEnum;
import com.dumb.common.exception.BizException;
import com.dumb.config.TmdbProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
public class TmdbClient {

    private final TmdbProperties tmdbProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public TmdbClient(TmdbProperties tmdbProperties, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.tmdbProperties = tmdbProperties;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 智能搜索：返回最匹配的电影详情。
     * 如果只有一个结果直接返回；多个结果时由调用方用 AI 消歧。
     */
    public Optional<TmdbMovieContext> findMovie(String search) {
        List<TmdbSearchCandidate> candidates = searchMovies(search, 5);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        // 只有一个候选，直接用它
        if (candidates.size() == 1) {
            return fetchMovieDetail(candidates.get(0).getId());
        }
        // 多个候选时，默认取第一个（调用方可以用 selectBestCandidate 做 AI 消歧）
        return fetchMovieDetail(candidates.get(0).getId());
    }

    /**
     * 搜索电影，返回候选列表（最多 limit 个），供 AI 消歧使用。
     */
    public List<TmdbSearchCandidate> searchMovies(String search, int limit) {
        if (!StringUtils.hasText(tmdbProperties.getApiKey())) {
            log.warn("TMDB API Key 未配置，跳过 TMDB 查询");
            return List.of();
        }
        if (!StringUtils.hasText(search)) {
            return List.of();
        }

        try {
            String searchUrl = UriComponentsBuilder.fromHttpUrl(tmdbProperties.getBaseUrl() + "/search/movie")
                .queryParam("api_key", tmdbProperties.getApiKey())
                .queryParam("query", search.trim())
                .queryParam("language", "zh-CN")
                .toUriString();

            String searchResponse = restTemplate.getForObject(searchUrl, String.class);
            if (!StringUtils.hasText(searchResponse)) {
                return List.of();
            }

            JsonNode root = objectMapper.readTree(searchResponse);
            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) {
                return List.of();
            }

            List<TmdbSearchCandidate> candidates = new ArrayList<>();
            int count = Math.min(results.size(), limit);
            for (int i = 0; i < count; i++) {
                JsonNode node = results.get(i);
                TmdbSearchCandidate c = new TmdbSearchCandidate();
                c.setId(node.path("id").asInt(0));
                c.setTitle(node.path("title").asText(""));
                c.setOriginalTitle(node.path("original_title").asText(""));
                c.setOverview(node.path("overview").asText(""));
                c.setReleaseDate(parseDate(node.path("release_date")));
                c.setVoteAverage(parseVoteAverage(node.path("vote_average")));
                c.setVoteCount(node.path("vote_count").asInt(0));
                c.setPosterPath(node.path("poster_path").asText(""));
                if (c.getId() > 0) {
                    candidates.add(c);
                }
            }
            return candidates;

        } catch (RestClientException e) {
            log.warn("调用 TMDB 搜索失败: {}", e.getMessage());
            return List.of();
        } catch (Exception e) {
            log.warn("解析 TMDB 搜索响应失败: {}", e.getMessage());
            return List.of();
        }
    }

    public Optional<TmdbMovieContext> fetchMovieDetail(int movieId) {
        try {
            String detailUrl = UriComponentsBuilder.fromHttpUrl(tmdbProperties.getBaseUrl() + "/movie/" + movieId)
                .queryParam("api_key", tmdbProperties.getApiKey())
                .queryParam("language", "zh-CN")
                .toUriString();

            String detailResponse = restTemplate.getForObject(detailUrl, String.class);
            if (!StringUtils.hasText(detailResponse)) {
                return Optional.empty();
            }

            JsonNode media = objectMapper.readTree(detailResponse);
            if (media.path("success").isBoolean() && !media.path("success").asBoolean()) {
                log.warn("TMDB 返回电影详情错误: id={}, status_message={}", movieId,
                    media.path("status_message").asText(""));
                return Optional.empty();
            }

            TmdbMovieContext ctx = new TmdbMovieContext();
            ctx.setId(movieId);
            ctx.setTitle(media.path("title").asText(""));
            ctx.setOverview(media.path("overview").asText(""));
            ctx.setPosterPath(media.path("poster_path").asText(""));
            ctx.setBackdropPath(media.path("backdrop_path").asText(""));
            ctx.setReleaseDate(parseDate(media.path("release_date")));

            JsonNode voteNode = media.path("vote_average");
            if (!voteNode.isMissingNode() && !voteNode.isNull()) {
                ctx.setVoteAverage(BigDecimal.valueOf(voteNode.asDouble(0))
                    .setScale(1, RoundingMode.HALF_UP));
            }

            JsonNode genresNode = media.path("genres");
            List<String> genres = new ArrayList<>();
            if (genresNode.isArray()) {
                for (JsonNode g : genresNode) {
                    String name = g.path("name").asText("");
                    if (StringUtils.hasText(name)) {
                        genres.add(name);
                    }
                }
            }
            ctx.setGenres(genres);

            JsonNode countriesNode = media.path("production_countries");
            List<String> countries = new ArrayList<>();
            if (countriesNode.isArray()) {
                for (JsonNode c : countriesNode) {
                    String iso = c.path("iso_3166_1").asText("");
                    if (StringUtils.hasText(iso)) {
                        countries.add(iso);
                    }
                }
            }
            ctx.setProductionCountries(countries);

            log.info("TMDB 命中电影: id={}, title={}, voteAverage={}, genres={}",
                movieId, ctx.getTitle(), ctx.getVoteAverage(), ctx.getGenres());
            return Optional.of(ctx);

        } catch (Exception e) {
            log.warn("获取 TMDB 电影详情失败: id={}, reason={}", movieId, e.getMessage());
            return Optional.empty();
        }
    }

    public String buildImageUrl(String path) {
        if (!StringUtils.hasText(path)) {
            return null;
        }
        String base = tmdbProperties.getImageBaseUrl();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String p = path.startsWith("/") ? path : "/" + path;
        return base + p;
    }

    private static String parseDate(JsonNode dateNode) {
        if (dateNode.isMissingNode() || dateNode.isNull()) {
            return null;
        }
        String date = dateNode.asText("").trim();
        if (date.isEmpty() || "null".equals(date)) {
            return null;
        }
        return date;
    }

    private static BigDecimal parseVoteAverage(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }
        try {
            return BigDecimal.valueOf(node.asDouble(0))
                .setScale(1, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return null;
        }
    }
}
