package com.example.fulfillment.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductDto {
    public Long id;
    public String name;
    public String category;
}
