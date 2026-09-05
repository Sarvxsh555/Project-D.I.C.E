package com.example.governance.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomerDto {
    public Long id;
    public String name;
    public String tier;
}
