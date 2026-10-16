package com.dumb.service;

import com.dumb.dto.request.ReviewAiGenerateRequest;
import com.dumb.dto.request.ReviewCreateRequest;
import com.dumb.dto.request.ReviewSearchRequest;
import com.dumb.dto.response.ReviewAiGenerateResponse;
import com.dumb.dto.response.ReviewListItemVO;
import com.dumb.entity.Review;

import java.util.List;

public interface ReviewService {
    Review create(ReviewCreateRequest request, String username);
    List<ReviewListItemVO> search(ReviewSearchRequest request);
    List<ReviewListItemVO> adminSearch(ReviewSearchRequest request);
    Review getById(Long id);
    Review adminGetById(Long id);
    Review update(Long id, ReviewCreateRequest request);
    void deleteById(Long id);

    /**
     * 鏍规嵁鑹轰汉銆佷笓杈戝悕璋冪敤 AI锛堝彲缁撳悎 Spotify 鍏冩暟鎹級鐢熸垚涔愯瘎鑽夌瀛楁銆?
     */
    ReviewAiGenerateResponse generateAiAssist(ReviewAiGenerateRequest request);
}

