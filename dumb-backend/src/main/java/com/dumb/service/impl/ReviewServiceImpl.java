package com.dumb.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.dumb.common.enums.ContentStatusEnum;
import com.dumb.common.enums.ContentTypeEnum;
import com.dumb.common.enums.ResultCodeEnum;
import com.dumb.common.exception.BizException;
import com.dumb.dto.request.ReviewAiGenerateRequest;
import com.dumb.dto.request.ReviewCreateRequest;
import com.dumb.dto.request.ReviewSearchRequest;
import com.dumb.dto.response.ReviewAiGenerateResponse;
import com.dumb.dto.response.ReviewListItemVO;
import com.dumb.entity.Review;
import com.dumb.entity.User;
import com.dumb.mapper.CommentMapper;
import com.dumb.mapper.ReviewMapper;
import com.dumb.mapper.UserMapper;
import com.dumb.service.ReviewAiGenerationService;
import com.dumb.service.ReviewService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewMapper reviewMapper;
    private final CommentMapper commentMapper;
    private final UserMapper userMapper;
    private final com.dumb.mapper.AlbumMapper albumMapper;
    private final ReviewAiGenerationService reviewAiGenerationService;

    public ReviewServiceImpl(ReviewMapper reviewMapper, CommentMapper commentMapper, UserMapper userMapper, com.dumb.mapper.AlbumMapper albumMapper, ReviewAiGenerationService reviewAiGenerationService) {
        this.reviewMapper = reviewMapper;
        this.commentMapper = commentMapper;
        this.userMapper = userMapper;
        this.albumMapper = albumMapper;
        this.reviewAiGenerationService = reviewAiGenerationService;
    }

    @Override
    public Review create(ReviewCreateRequest request, String username) {
        User user = userMapper.selectByUsername(username);
        if (user == null) {
            throw new BizException(ResultCodeEnum.UNAUTHORIZED, "用户不存在");
        }
        
        // 创建新的专辑记录
        com.dumb.entity.Album album = createAlbumFromReview(request);
        albumMapper.insert(album);
        
        Review review = new Review();
        review.setAlbumId(album.getId());
        review.setTitle(request.getTitle());
        review.setContent(request.getContent());
        review.setScore(request.getScore());
        review.setCoverImage(request.getCoverImage());
        review.setAuthorId(user.getId());
        review.setStatus(ContentStatusEnum.PUBLISHED.getCode());
        review.setPublishTime(LocalDateTime.now());
        reviewMapper.insert(review);
        
        return review;
    }

    @Override
    public List<ReviewListItemVO> search(ReviewSearchRequest request) {
        return reviewMapper.searchPublishedReviews(request.getKeyword(), request.getGenre(), request.getMinScore(), request.getMaxScore());
    }

    @Override
    public List<ReviewListItemVO> adminSearch(ReviewSearchRequest request) {
        return reviewMapper.searchAdminReviews(request.getKeyword(), request.getGenre(), request.getMinScore(), request.getMaxScore());
    }

    @Override
    public Review getById(Long id) {
        Review review = reviewMapper.selectOne(new LambdaQueryWrapper<Review>()
            .eq(Review::getId, id)
            .eq(Review::getStatus, ContentStatusEnum.PUBLISHED.getCode()));
        if (review == null) {
            throw new BizException(ResultCodeEnum.NOT_FOUND, "乐评不存在");
        }
        BigDecimal avgScore = commentMapper.selectAverageScoreByTarget(ContentTypeEnum.REVIEW.getCode(), id);
        if (avgScore != null) {
            review.setScore(avgScore);
        }
        return review;
    }

    @Override
    public Review adminGetById(Long id) {
        Review review = reviewMapper.selectById(id);
        if (review == null) {
            throw new BizException(ResultCodeEnum.NOT_FOUND, "乐评不存在");
        }
        BigDecimal avgScore = commentMapper.selectAverageScoreByTarget(ContentTypeEnum.REVIEW.getCode(), id);
        if (avgScore != null) {
            review.setScore(avgScore);
        }
        return review;
    }

    @Override
    public Review update(Long id, ReviewCreateRequest request) {
        Review existing = reviewMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ResultCodeEnum.NOT_FOUND, "乐评不存在");
        }
        
        // 更新对应的专辑信息
        com.dumb.entity.Album album = albumMapper.selectById(existing.getAlbumId());
        if (album != null) {
            updateAlbumInfo(album, request);
            albumMapper.updateById(album);
        }
        
        existing.setTitle(request.getTitle());
        existing.setContent(request.getContent());
        existing.setScore(request.getScore());
        existing.setCoverImage(request.getCoverImage());
        existing.setUpdateTime(LocalDateTime.now());
        reviewMapper.updateById(existing);
        
        return existing;
    }
    
    /**
     * 从乐评请求中创建新的专辑记录
     */
    private com.dumb.entity.Album createAlbumFromReview(ReviewCreateRequest request) {
        com.dumb.entity.Album album = new com.dumb.entity.Album();
        updateAlbumInfo(album, request);
        return album;
    }
    
    /**
     * 从乐评请求中更新专辑信息
     */
    private void updateAlbumInfo(com.dumb.entity.Album album, ReviewCreateRequest request) {
        // 从title解析艺人和专辑名称: "艺人 - 专辑名称"
        String title = request.getTitle();
        if (title != null && title.contains(" - ")) {
            String[] parts = title.split(" - ", 2);
            if (parts.length == 2) {
                album.setArtist(parts[0].trim());
                album.setTitle(parts[1].trim());
            }
        }
        
        // 从content解析风格和年份
        // 格式: "风格：XXX\n年份：YYYY\n\n描述内容"
        String content = request.getContent();
        if (content != null) {
            String[] lines = content.split("\n");
            for (String line : lines) {
                if (line.startsWith("风格：")) {
                    String genre = line.replace("风格：", "").trim();
                    if (!genre.isEmpty()) {
                        album.setGenre(genre);
                    }
                } else if (line.startsWith("年份：")) {
                    String year = line.replace("年份：", "").trim();
                    if (!year.isEmpty()) {
                        try {
                            album.setReleaseDate(java.time.LocalDate.of(Integer.parseInt(year), 1, 1));
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
        }
        
        // 更新封面
        if (request.getCoverImage() != null && !request.getCoverImage().isEmpty()) {
            album.setCoverImage(request.getCoverImage());
        }
    }

    @Override
    public void deleteById(Long id) {
        Review existing = reviewMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ResultCodeEnum.NOT_FOUND, "乐评不存在");
        }
        reviewMapper.deleteById(id);
    }

    @Override
    public ReviewAiGenerateResponse generateAiAssist(ReviewAiGenerateRequest request) {
        return reviewAiGenerationService.generate(request);
    }
}
