package com.example.controller;

import com.example.service.SettingsService;
import com.example.model.Settings;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("")
    public ResponseEntity<List<Settings>> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Settings> getSettings1(@PathVariable Long id) {
        return ResponseEntity.ok(settingsService.getSettings1(id));
    }

    @PostMapping("")
    public ResponseEntity<Settings> postSettings2(@RequestBody SettingsRequest request) {
        return ResponseEntity.ok(settingsService.postSettings2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Settings> putSettings3(@PathVariable Long id, @RequestBody SettingsRequest request) {
        return ResponseEntity.ok(settingsService.putSettings3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteSettings4(@PathVariable Long id) {
        settingsService.deleteSettings4(id);
        return ResponseEntity.noContent().build();
    }
}
