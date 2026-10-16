package com.dumb.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.dumb.dto.response.ReviewListItemVO;
import com.dumb.entity.Review;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReviewMapper extends BaseMapper<Review> {
    List<ReviewListItemVO> searchPublishedReviews(@Param("keyword") String keyword,
                                                  @Param("genre") String genre,
                                                  @Param("minScore") Double minScore,
                                                  @Param("maxScore") Double maxScore);

    List<ReviewListItemVO> searchAdminReviews(@Param("keyword") String keyword,
                                              @Param("genre") String genre,
                                              @Param("minScore") Double minScore,
                                              @Param("maxScore") Double maxScore);
}
