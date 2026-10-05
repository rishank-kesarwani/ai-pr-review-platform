import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModel: any;
  let mockNotificationPrefModel: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockNotificationPrefModel = {
      create: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-mock-token'),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('mock-jwt-secret'),
    };

    authService = new AuthService(
      mockUserModel,
      mockNotificationPrefModel,
      mockJwtService,
      mockConfigService,
    );
  });

  it('should register new user and return tokens', async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue({
      _id: 'user123',
      email: 'alex@example.com',
      name: 'Alex',
      roles: ['user'],
    });

    const dto: RegisterDto = {
      email: 'alex@example.com',
      password: 'StrongPassword123!',
      name: 'Alex',
    };

    const result = await authService.register(dto);
    expect(result.user.email).toBe('alex@example.com');
    expect(result.accessToken).toBe('jwt-mock-token');
    expect(result.refreshToken).toBe('jwt-mock-token');
    expect(mockNotificationPrefModel.create).toHaveBeenCalled();
  });

  it('should reject login with incorrect password', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword', 10);
    mockUserModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user123',
        email: 'alex@example.com',
        passwordHash,
      }),
    });

    const dto: LoginDto = {
      email: 'alex@example.com',
      password: 'WrongPassword',
    };

    await expect(authService.login(dto)).rejects.toThrow('Invalid email or password');
  });
});
