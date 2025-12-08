const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// CONFIGURATION
const USERNAME = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[0] : 'YOUR_USERNAME_HERE';
// We prefer the Personal Access Token (GH_TOKEN) if available, otherwise fallback to default
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OUTPUT_FILE = 'retro-profile.svg';

const EXCLUDED_LANGUAGES = ['HTML', 'CSS', 'SCSS', 'Sass', 'Less', 'Stylus', 'Jupyter Notebook', 'Dockerfile', 'Shell'];

async function fetchGitHubStats() {
    if (!TOKEN) {
        throw new Error('Error: GITHUB_TOKEN/GH_TOKEN is missing.');
    }

    console.log(`Fetching deep stats for user: ${USERNAME}...`);

    // UPDATED QUERY: 
    // 1. ownerAffiliations now includes COLLABORATOR and ORGANIZATION_MEMBER
    // 2. We fetch privacy status and isFork to calculate properly
    const query = `
    query userInfo($login: String!) {
      user(login: $login) {
        name
        login
        createdAt
        followers { totalCount }
        following { totalCount }
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
        }
        # Fetching top 100 repos where user is Owner, Collaborator, or Org Member
        repositories(ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            isPrivate
            isFork
            stargazers { totalCount }
            forkCount
            # We get languages for every repo to sum them up manually
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name }
              }
            }
          }
        }
      }
    }
    `;

    try {
        const response = await axios.post(
            'https://api.github.com/graphql',
            { query, variables: { login: USERNAME } },
            { headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
        );

        if (response.data.errors) {
            console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
            throw new Error('Failed to fetch data');
        }

        const user = response.data.data.user;

        // --- CALCULATION LOGIC ---
        let totalStars = 0;
        let totalForks = 0;
        let publicRepos = 0;
        let privateRepos = 0;
        
        // Language Math
        const languageStats = {};
        let totalSize = 0;

        user.repositories.nodes.forEach(repo => {
            // 1. General Stats
            totalStars += repo.stargazers.totalCount;
            totalForks += repo.forkCount;
            
            if (repo.isPrivate) privateRepos++;
            else publicRepos++;

            // 2. Language Stats
            // GitHub usually excludes FORKS from language stats to avoid skewing data
            if (!repo.isFork && repo.languages && repo.languages.edges) {
                repo.languages.edges.forEach(edge => {
                    const langName = edge.node.name;
                    const size = edge.size;
                    
                    if (!EXCLUDED_LANGUAGES.includes(langName)) {
                        languageStats[langName] = (languageStats[langName] || 0) + size;
                        totalSize += size;
                    }
                });
            }
        });

        const topLangs = Object.entries(languageStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([name, size]) => ({
                name,
                percent: Math.round((size / totalSize) * 100)
            }));

        const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 365));

        return {
            name: user.name || user.login,
            username: user.login,
            accountAge,
            // Use the API's total count (includes all pages), not just the 100 we fetched
            totalRepos: user.repositories.totalCount, 
            publicRepos,
            privateRepos, // This might be lower than totalRepos if user has >100 repos (pagination limit)
            totalCommits: user.contributionsCollection.totalCommitContributions,
            totalIssues: user.contributionsCollection.totalIssueContributions,
            totalPRs: user.contributionsCollection.totalPullRequestContributions,
            totalReviews: user.contributionsCollection.totalPullRequestReviewContributions,
            followers: user.followers.totalCount,
            following: user.following.totalCount,
            totalStars,
            totalForks,
            topLangs
        };

    } catch (error) {
        console.error('API Error:', error.message);
        process.exit(1);
    }
}

async function generateSVG() {
    const stats = await fetchGitHubStats();
    console.log('Stats calculated:', stats);

    let progressBarsHtml = '';
    // FIXED Y POSITION
    let yPos = 740; 
    
    stats.topLangs.forEach(lang => {
        const displayPercent = lang.percent < 1 ? 1 : lang.percent;
        const barWidth = 320 * (displayPercent / 100);
        const safeName = lang.name.replace(/[^a-zA-Z0-9]/g, '');

        progressBarsHtml += `
            <g transform="translate(70, ${yPos})">
                <rect x="-2" y="-2" width="324" height="32" fill="none" stroke="#00ff00" stroke-width="1" opacity="0.3" rx="3"/>
                <rect x="0" y="0" width="320" height="28" fill="#000000" stroke="#003300" stroke-width="1" rx="2"/>
                <defs>
                    <linearGradient id="grad-${safeName}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#00ff00;stop-opacity:0.6" />
                        <stop offset="50%" style="stop-color:#00ff00;stop-opacity:0.9" />
                        <stop offset="100%" style="stop-color:#39ff14;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="2" y="2" width="${barWidth - 4}" height="24" fill="url(#grad-${safeName})" rx="1" filter="url(#glow)"/>
                <rect x="2" y="2" width="${barWidth - 4}" height="8" fill="url(#shine)" opacity="0.4" rx="1"/>
                <rect x="0" y="0" width="320" height="28" fill="none" stroke="#00ff00" stroke-width="1.5" rx="2" filter="url(#glow)"/>
                <rect x="340" y="0" width="130" height="28" fill="#001a00" stroke="#00ff00" stroke-width="1" rx="2"/>
                <text x="405" y="19" text-anchor="middle" fill="#00ff00" font-family="'Courier New', monospace" font-weight="bold" font-size="16" filter="url(#textGlow)">${lang.name}</text>
                <rect x="490" y="0" width="70" height="28" fill="#000000" stroke="#ffff00" stroke-width="2" rx="2" filter="url(#glow)"/>
                <rect x="492" y="2" width="66" height="24" fill="none" stroke="#ffff00" stroke-width="1" opacity="0.3" rx="1"/>
                <text x="525" y="19" text-anchor="middle" fill="#ffff00" font-family="'Courier New', monospace" font-weight="bold" font-size="16" filter="url(#strongGlow)">${lang.percent}%</text>
            </g>
        `;
        yPos += 42;
    });

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0];

    const svgContent = `
    <svg width="1000" height="1400" viewBox="0 0 1000 1400" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&amp;display=swap');
                .retro-text { font-family: 'Share Tech Mono', 'Courier New', monospace; letter-spacing: 0.5px; }
                .mono-text { font-family: 'Courier New', monospace; font-weight: bold; }
            </style>
            <pattern id="scanlines" patternUnits="userSpaceOnUse" width="100" height="2">
                <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(0, 255, 0, 0.08)" stroke-width="1"/>
            </pattern>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 255, 0, 0.02)" stroke-width="1"/>
            </pattern>
            <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
                <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="textGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="strongGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="crt">
                <stop offset="0%" stop-color="transparent"/>
                <stop offset="100%" stop-color="rgba(0, 0, 0, 0.3)"/>
            </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="#000000"/>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        
        <rect x="30" y="30" width="940" height="1340" stroke="#00ff00" stroke-width="4" fill="none" rx="0" filter="url(#glow)"/>
        <rect x="35" y="35" width="930" height="1330" stroke="#00ff00" stroke-width="1" fill="none" rx="0" opacity="0.5"/>
        
        <g stroke="#00ff00" stroke-width="4" fill="none" filter="url(#strongGlow)">
            <line x1="30" y1="70" x2="30" y2="30" /><line x1="30" y1="30" x2="70" y2="30" />
            <line x1="970" y1="70" x2="970" y2="30" /><line x1="970" y1="30" x2="930" y2="30" />
            <line x1="30" y1="1330" x2="30" y2="1370" /><line x1="30" y1="1370" x2="70" y2="1370" />
            <line x1="970" y1="1330" x2="970" y2="1370" /><line x1="970" y1="1370" x2="930" y2="1370" />
        </g>

        <!-- Header -->
        <g transform="translate(70, 70)">
            <rect x="0" y="0" width="860" height="120" fill="#001100" stroke="#00ff00" stroke-width="3" rx="0" filter="url(#glow)"/>
            <rect x="5" y="5" width="850" height="110" fill="none" stroke="#00ff00" stroke-width="1" opacity="0.3"/>
            <rect x="0" y="0" width="860" height="35" fill="#003300" stroke="#00ff00" stroke-width="3"/>
            <text x="430" y="24" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="18" filter="url(#textGlow)">╔════════════════════════════════════════════════╗</text>
            <text x="430" y="70" text-anchor="middle" fill="#39ff14" class="mono-text" font-size="36" filter="url(#strongGlow)">${stats.name.toUpperCase()}</text>
            <text x="430" y="100" text-anchor="middle" fill="#00ff00" class="retro-text" font-size="18" opacity="0.8">@${stats.username} • GitHub Profile System v3.0</text>
        </g>

        <!-- Status -->
        <g transform="translate(70, 220)">
            <rect x="0" y="0" width="860" height="45" fill="#000000" stroke="#00ff00" stroke-width="2" filter="url(#glow)"/>
            <text x="20" y="28" fill="#00ff00" class="retro-text" font-size="16" filter="url(#textGlow)">[SYSTEM] >>> STATUS: ONLINE | TIMESTAMP: ${today} ${time} UTC</text>
            <rect x="820" y="12" width="20" height="20" fill="#00ff00" filter="url(#strongGlow)"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></rect>
        </g>

        <!-- Repo Stats -->
        <g transform="translate(70, 295)">
            <rect x="0" y="0" width="860" height="45" fill="#002200" stroke="#00ff00" stroke-width="2" filter="url(#glow)"/>
            <text x="430" y="30" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="24" filter="url(#strongGlow)">▓▓▓ REPOSITORY METRICS ▓▓▓</text>
            <g transform="translate(0, 60)">
                <rect x="10" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="30" y="25" fill="#00aa00" class="retro-text" font-size="14">TOTAL REPOS</text>
                <text x="145" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="24" filter="url(#textGlow)">${stats.totalRepos}</text>
                
                <rect x="295" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="315" y="25" fill="#00aa00" class="retro-text" font-size="14">PUBLIC</text>
                <text x="430" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="24" filter="url(#textGlow)">${stats.publicRepos}</text>
                
                <rect x="580" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="600" y="25" fill="#00aa00" class="retro-text" font-size="14">PRIVATE</text>
                <text x="715" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="24" filter="url(#textGlow)">${stats.privateRepos}</text>
                
                <rect x="10" y="70" width="270" height="55" fill="#001a00" stroke="#ffff00" stroke-width="2" rx="3"/>
                <text x="30" y="95" fill="#aaaa00" class="retro-text" font-size="14">TOTAL STARS</text>
                <text x="145" y="115" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="24" filter="url(#textGlow)">★ ${stats.totalStars}</text>
                
                <rect x="295" y="70" width="270" height="55" fill="#001a00" stroke="#ffff00" stroke-width="2" rx="3"/>
                <text x="315" y="95" fill="#aaaa00" class="retro-text" font-size="14">TOTAL FORKS</text>
                <text x="430" y="115" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="24" filter="url(#textGlow)">${stats.totalForks}</text>
                
                <rect x="580" y="70" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="600" y="95" fill="#00aa00" class="retro-text" font-size="14">COMMITS (YR)</text>
                <text x="715" y="115" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="24" filter="url(#textGlow)">${stats.totalCommits}</text>
            </g>
        </g>

        <!-- Contribution Stats -->
        <g transform="translate(70, 515)">
            <rect x="0" y="0" width="860" height="45" fill="#002200" stroke="#00ff00" stroke-width="2" filter="url(#glow)"/>
            <text x="430" y="30" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="24" filter="url(#strongGlow)">▓▓▓ CONTRIBUTIONS (THIS YEAR) ▓▓▓</text>
            <g transform="translate(0, 60)">
                <rect x="10" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="30" y="25" fill="#00aa00" class="retro-text" font-size="13">PULL REQUESTS</text>
                <text x="135" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="22" filter="url(#textGlow)">${stats.totalPRs}</text>
                
                <rect x="295" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="315" y="25" fill="#00aa00" class="retro-text" font-size="13">ISSUES</text>
                <text x="430" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="22" filter="url(#textGlow)">${stats.totalIssues}</text>
                
                <rect x="580" y="0" width="270" height="55" fill="#001a00" stroke="#00ff00" stroke-width="2" rx="3"/>
                <text x="600" y="25" fill="#00aa00" class="retro-text" font-size="13">REVIEWS</text>
                <text x="715" y="45" text-anchor="middle" fill="#00ff00" class="mono-text" font-size="22" filter="url(#textGlow)">${stats.totalReviews}</text>
            </g>
        </g>

        <!-- Tech Stack Header -->
        <g transform="translate(70, 690)">
            <rect x="0" y="0" width="860" height="45" fill="#002200" stroke="#00ff00" stroke-width="2" filter="url(#glow)"/>
            <text x="430" y="30" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="24" filter="url(#strongGlow)">▓▓▓ TECH_STACK.EXE ▓▓▓</text>
        </g>

        ${progressBarsHtml}

        <!-- Social -->
        <g transform="translate(70, ${yPos + 70})">
            <rect x="0" y="0" width="860" height="100" fill="#001100" stroke="#00ff00" stroke-width="2" filter="url(#glow)"/>
            <rect x="0" y="0" width="860" height="35" fill="#003300"/>
            <text x="430" y="24" text-anchor="middle" fill="#ffff00" class="mono-text" font-size="20" filter="url(#textGlow)">═══ SOCIAL NETWORK ═══</text>
            <g transform="translate(0, 50)">
                <rect x="50" y="0" width="230" height="40" fill="#001a00" stroke="#00ff00" stroke-width="1" rx="2"/>
                <text x="165" y="26" text-anchor="middle" fill="#ffffff" class="retro-text" font-size="18">👥 Followers: <tspan fill="#00ff00" font-weight="bold">${stats.followers}</tspan></text>
                <rect x="315" y="0" width="230" height="40" fill="#001a00" stroke="#00ff00" stroke-width="1" rx="2"/>
                <text x="430" y="26" text-anchor="middle" fill="#ffffff" class="retro-text" font-size="18">Following: <tspan fill="#00ff00" font-weight="bold">${stats.following}</tspan></text>
                <rect x="580" y="0" width="230" height="40" fill="#001a00" stroke="#00ff00" stroke-width="1" rx="2"/>
                <text x="695" y="26" text-anchor="middle" fill="#ffffff" class="retro-text" font-size="18">⏱ Age: <tspan fill="#00ff00" font-weight="bold">${stats.accountAge}y</tspan></text>
            </g>
        </g>

        <!-- Footer -->
        <g transform="translate(70, ${yPos + 200})">
            <rect x="0" y="0" width="860" height="60" fill="#000000" stroke="#00ff00" stroke-width="2" rx="0" filter="url(#glow)"/>
            <text x="20" y="28" fill="#00ff00" class="retro-text" font-size="15" filter="url(#textGlow)">root@github:~$ systemctl status profile.service</text>
            <text x="20" y="48" fill="#00ff00" class="retro-text" font-size="14" opacity="0.7">● Active: running | Last Update: ${today} ${time}</text>
            <rect x="500" y="33" width="10" height="18" fill="#00ff00"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect>
        </g>
        
        <text x="500" y="${yPos + 310}" text-anchor="middle" fill="#006600" class="retro-text" font-size="16">▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬</text>
        <text x="500" y="${yPos + 335}" text-anchor="middle" fill="#00aa00" class="retro-text" font-size="14">[SYSTEM] Generated via GitHub Actions • Terminal Theme v3.0</text>

        <rect width="100%" height="100%" fill="url(#scanlines)" pointer-events="none" opacity="0.8"/>
        <ellipse cx="500" cy="700" rx="600" ry="800" fill="url(#crt)" pointer-events="none"/>
    </svg>
    `;

    fs.writeFileSync(OUTPUT_FILE, svgContent);
    console.log(`✅ Successfully generated ${OUTPUT_FILE}`);
}

generateSVG();
