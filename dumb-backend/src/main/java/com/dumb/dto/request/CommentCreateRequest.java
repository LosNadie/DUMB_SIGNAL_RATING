package com.dumb.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommentCreateRequest {
    @NotBlank(message = "内容类型不能为空")
    private String contentType;
    @NotNull(message = "内容ID不能为空")
    private Long contentId;
    @NotBlank(message = "评论内容不能为空")
    private String content;
    private Long parentId;
}
