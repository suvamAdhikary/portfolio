// GitHub API integration for the Projects section. Memoised so the English and Japanese
// home pages share one request per build.
export interface GithubRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  updated_at: string;
}

let cached: Promise<GithubRepo[]> | undefined;

async function fetchRepos(): Promise<GithubRepo[]> {
  try {
    const token = import.meta.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(
      'https://api.github.com/users/suvamAdhikary/repos?sort=updated&per_page=100',
      {
        headers,
      }
    );

    if (response.ok) {
      const repos: GithubRepo[] = await response.json();
      return repos
        .filter((repo) => !repo.fork && !repo.archived)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  } catch (error) {
    console.warn('Failed to fetch GitHub projects:', error);
  }
  return [];
}

export function getGithubRepos(): Promise<GithubRepo[]> {
  cached ??= fetchRepos();
  return cached;
}
