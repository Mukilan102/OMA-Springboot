package com.example.OMA;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;
import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class OmaApplication {

	@PostConstruct
	void setUTCTimezone() {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
	}

	public static void main(String[] args) {
		SpringApplication.run(OmaApplication.class, args);
	}

}
