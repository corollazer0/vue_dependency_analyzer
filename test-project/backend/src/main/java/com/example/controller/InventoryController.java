package com.example.controller;

import com.example.service.InventoryService;
import com.example.model.Inventory;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("")
    public ResponseEntity<List<Inventory>> getInventory() {
        return ResponseEntity.ok(inventoryService.getInventory());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inventory> getInventory1(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getInventory1(id));
    }

    @PostMapping("")
    public ResponseEntity<Inventory> postInventory2(@RequestBody InventoryRequest request) {
        return ResponseEntity.ok(inventoryService.postInventory2());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inventory> putInventory3(@PathVariable Long id, @RequestBody InventoryRequest request) {
        return ResponseEntity.ok(inventoryService.putInventory3(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<void> deleteInventory4(@PathVariable Long id) {
        inventoryService.deleteInventory4(id);
        return ResponseEntity.noContent().build();
    }
}
