# Universal GPS Backend Enhancement TODO

## Progress Tracking
- [ ] 1. Create services/normalizer.js (extract normalization logic)
- [x] 2. Fix models/tracker.js & location.js (device_id standardization, add speed/battery, fix assoc)
- [x] 3. Create migration to add speed/battery to Locations, fix keys
- [x] 4. Update controllers/tracker.controller.js to use normalizer service
- [x] 5. Implement TCP server in tcpServer.js for IMEI packets
- [x] 6. Add rate-limiting & queue to server.js
- [x] 7. Run migrations, test all formats, complete! 🎉

Current: Starting step 1.

