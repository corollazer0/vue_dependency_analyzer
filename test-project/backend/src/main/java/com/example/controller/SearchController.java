package com.example.controller;

import com.example.service.SearchService;
import com.example.model.Search;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("")
    public ResponseEntity<List<Search>> getSearch() {
        return ResponseEntity.ok(searchService.getSearch());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Search> getSearch1(@PathVariable Long id) {
        return ResponseEntity.ok(searchService.getSearch1(id));
    }

    @PostMapping("")
    public ResponseEntity<Search> postSearch2(@RequestBody SearchRequest request) {
        return ResponseEntity.ok(searchService.postSearch2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Search> putSearch3(@PathVariable Long id, @RequestBody SearchRequest request) {
        return ResponseEntity.ok(searchService.putSearch3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteSearch4(@PathVariable Long id) {
        searchService.deleteSearch4(id);
        return ResponseEntity.noContent().build();
    }
}
