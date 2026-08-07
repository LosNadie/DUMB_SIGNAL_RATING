package com.dumb.integration.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * DeepSeek 电影消歧选择结果。
 * 让 AI 从多个 TMDB 候选中选出最匹配用户意图的那一个。
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiMovieSelector {

    /**
     * 选中的 TMDB 电影 ID
     */
    private Integer selectedId;

    /**
     * 选择理由（可选，用于日志调试）
     */
    private String reason;
}
