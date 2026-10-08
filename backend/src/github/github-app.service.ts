import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);

  constructor(private configService: ConfigService) {}

  isConfigured(): boolean {
    const appId = this.configService.get<string>("app.github.appId");
    const privateKey = this.configService.get<string>("app.github.privateKey");
    return Boolean(appId && privateKey);
  }

  getAppOctokit(): Octokit {
    const token = this.configService.get<string>("app.github.token") || process.env.GITHUB_TOKEN;
    if (token) {
      return new Octokit({ auth: token });
    }
    return new Octokit();
  }

  getPublicOctokit(): Octokit {
    return this.getAppOctokit();
  }

  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    const appId = this.configService.get<string>("app.github.appId");
    const privateKey = this.configService.get<string>("app.github.privateKey");

    if (!appId || !privateKey) {
      this.logger.warn("GitHub App not configured; falling back to standard Octokit");
      return this.getPublicOctokit();
    }

    const auth = createAppAuth({
      appId,
      privateKey,
    });

    const installationAuth = await auth({
      type: "installation",
      installationId,
    });

    return new Octokit({
      auth: installationAuth.token,
    });
  }
}
