package com.dumb.integration.tmdb;

import lombok.Data;

import java.math.BigDecimal;

/**
 * TMDB 搜索返回的单个候选电影，用于 AI 消歧选择。
 */
@Data
public class TmdbSearchCandidate {

    private Integer id;

    private String title;

    private String originalTitle;

    private String overview;

    private String releaseDate;

    private BigDecimal voteAverage;

    private Integer voteCount;

    private String posterPath;

    /**
     * 生成给 AI 看的摘要文本
     */
    public String toAiSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append("- ID: ").append(id);
        sb.append(", 标题: ").append(title);
        if (originalTitle != null && !originalTitle.equals(title)) {
            sb.append(" (原名: ").append(originalTitle).append(")");
        }
        if (releaseDate != null && !releaseDate.isEmpty()) {
            sb.append(", 年份: ").append(releaseDate.substring(0, 4));
        }
        if (voteAverage != null) {
            sb.append(", 评分: ").append(voteAverage).append("/10");
        }
        if (overview != null && !overview.isEmpty()) {
            String desc = overview.length() > 120 ? overview.substring(0, 120) + "..." : overview;
            sb.append(", 简介: ").append(desc);
        }
        return sb.toString();
    }
}
