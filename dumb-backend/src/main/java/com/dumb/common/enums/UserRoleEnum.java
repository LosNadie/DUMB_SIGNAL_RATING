package com.dumb.common.enums;

import com.dumb.common.enums.base.BaseEnum;
import lombok.Getter;

@Getter
public enum UserRoleEnum implements BaseEnum<String> {
    ADMIN("ADMIN"),
    EDITOR("EDITOR"),
    USER("USER");

    private final String code;

    UserRoleEnum(String code) {
        this.code = code;
    }
}
