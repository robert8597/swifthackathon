package com.db.swift.dfx.service.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.http.HttpClient;
import java.util.List;

@Configuration
@Slf4j
public class RestClientConfig {

    @Value("${lei.api.base-url}")
    private String leiApiBaseUrl;

    @Value("${proxy.host:}")
    private String proxyHost;

    @Value("${proxy.port:0}")
    private int proxyPort;

    /**
     * Creates a RestClient bean for communicating with the external LEI API.
     * The base URL is configured in the application properties.
     */
    @Bean
    public RestClient leiRestClient() {
        MappingJackson2HttpMessageConverter customConverter = new MappingJackson2HttpMessageConverter();
        customConverter.setSupportedMediaTypes(List.of(
                new MediaType("application", "vnd.api+json"),
                MediaType.APPLICATION_JSON // Also support standard JSON as a good practice
        ));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(leiApiBaseUrl)
                .messageConverters(converters -> converters.add(0, customConverter));

        if (StringUtils.hasText(proxyHost) && proxyPort > 0) {
            log.info("Configuring RestClient with proxy: {}:{}", proxyHost, proxyPort);

            // Create an HttpClient with the specified proxy
            HttpClient httpClient = HttpClient.newBuilder()
                    .proxy(ProxySelector.of(new InetSocketAddress(proxyHost, proxyPort)))
                    .build();

            // Create a request factory using the proxied HttpClient
            ClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);

            // Apply the factory to the RestClient builder
            builder.requestFactory(requestFactory);
        } else {
            log.info("No proxy configured for RestClient.");
        }

        return builder.build();

    }
}
