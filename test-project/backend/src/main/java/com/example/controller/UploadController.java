package com.example.controller;

import com.example.service.UploadService;
import com.example.model.Upload;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final UploadService uploadService;

    public UploadController(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    @GetMapping("")
    public ResponseEntity<List<Upload>> getUpload() {
        return ResponseEntity.ok(uploadService.getUpload());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Upload> getUpload1(@PathVariable Long id) {
        return ResponseEntity.ok(uploadService.getUpload1(id));
    }

    @PostMapping("")
    public ResponseEntity<Upload> postUpload2(@RequestBody UploadRequest request) {
        return ResponseEntity.ok(uploadService.postUpload2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Upload> putUpload3(@PathVariable Long id, @RequestBody UploadRequest request) {
        return ResponseEntity.ok(uploadService.putUpload3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteUpload4(@PathVariable Long id) {
        uploadService.deleteUpload4(id);
        return ResponseEntity.noContent().build();
    }
}
