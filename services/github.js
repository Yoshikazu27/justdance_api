const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH
} = process.env;

const FILE_PATH = "songs-list.json";

export async function updateGithub(data) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

    // Obtener el SHA del archivo actual
    const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
        }
    });

    if (!response.ok) {
        throw new Error(`No se pudo obtener ${FILE_PATH}: ${response.status}`);
    }

    const file = await response.json();

    const content = Buffer
        .from(JSON.stringify(data, null, 2))
        .toString("base64");

    // Actualizar el archivo
    const update = await fetch(apiUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Actualización automática desde la API",
            content,
            sha: file.sha,
            branch: GITHUB_BRANCH
        })
    });

    if (!update.ok) {
        const error = await update.text();
        throw new Error(error);
    }

    console.log("✅ GitHub actualizado correctamente");
}