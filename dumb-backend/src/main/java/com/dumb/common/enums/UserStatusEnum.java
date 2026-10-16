package com.dumb.common.enums;

import com.dumb.common.enums.base.BaseEnum;
import lombok.Getter;

@Getter
public enum UserStatusEnum implements BaseEnum<String> {
    ENABLED("ENABLED");

    private final String code;

    UserStatusEnum(String code) {
        this.code = code;
    }
}
