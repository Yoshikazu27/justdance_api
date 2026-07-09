const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH
} = process.env;

const FILE_PATH = "songs-list.json";

export async function updateGithub(data, message) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

    const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
        }
    });

    if (!response.ok) {
        throw new Error(`Cannot found ${FILE_PATH}: ${response.status}`);
    }

    const file = await response.json();

    const content = Buffer
        .from(JSON.stringify(data, null, 2))
        .toString("base64");

    const update = await fetch(apiUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message,
            content,
            sha: file.sha,
            branch: GITHUB_BRANCH
        })
    });

    if (!update.ok) {
        const error = await update.text();
        throw new Error(error);
    }
}