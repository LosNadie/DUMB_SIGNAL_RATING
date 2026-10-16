package com.dumb.common.enums;

import com.dumb.common.enums.base.BaseEnum;
import lombok.Getter;

@Getter
public enum ContentStatusEnum implements BaseEnum<String> {
    PUBLISHED("PUBLISHED");

    private final String code;

    ContentStatusEnum(String code) {
        this.code = code;
    }
}
