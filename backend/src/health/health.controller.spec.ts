import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  it('should return ok when MongoDB is connected (readyState === 1)', () => {
    const mockConnection: any = { readyState: 1 };
    controller = new HealthController(mockConnection);

    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('ai-pr-review-backend');
    expect(result.database.status).toBe('connected');
    expect(result.database.readyState).toBe(1);
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it('should return degraded when MongoDB is not connected (readyState === 0)', () => {
    const mockConnection: any = { readyState: 0 };
    controller = new HealthController(mockConnection);

    const result = controller.check();
    expect(result.status).toBe('degraded');
    expect(result.database.status).toBe('disconnected');
    expect(result.database.readyState).toBe(0);
  });
});
