package com.dumb.common.enums;

import com.dumb.common.enums.base.BaseEnum;
import lombok.Getter;

@Getter
public enum ContentTypeEnum implements BaseEnum<String> {
    REVIEW("REVIEW");

    private final String code;

    ContentTypeEnum(String code) {
        this.code = code;
    }
}
