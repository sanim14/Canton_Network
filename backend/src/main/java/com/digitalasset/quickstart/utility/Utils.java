package com.digitalasset.quickstart.utility;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public class Utils {

    private Utils() {}

    public static OffsetDateTime toOffsetDateTime(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
