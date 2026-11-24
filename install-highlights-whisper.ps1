$ErrorActionPreference = "Stop"
if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
    throw "Ce script installe Whisper pour Windows x64."
}

$toolsDirectory = Join-Path $PSScriptRoot ".highlights-tools"
$staging = Join-Path $toolsDirectory ([guid]::NewGuid().ToString("N"))
$modelFile = Join-Path $toolsDirectory "ggml-base.bin"
$binary = Join-Path $toolsDirectory "bin\whisper-cli.exe"
$modelHash = "465707469ff3a37a2b9b8d8f89f2f99de7299dac"

New-Item -Path $staging -ItemType Directory -Force | Out-Null
try {
    if (!(Test-Path -LiteralPath $binary)) {
        $archive = Join-Path $staging "whisper.zip"
        curl.exe --fail --location --retry 2 --output $archive "https://github.com/ggml-org/whisper.cpp/releases/download/v1.8.3/whisper-bin-x64.zip"
        if ($LASTEXITCODE -ne 0) { throw "Téléchargement de whisper.cpp impossible." }
        $archiveHash = "d824b1e37599f882b396e73f1ee0bfd5d0529f700314c48311dcbd00b803321d"
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $archiveHash) {
            throw "L’archive de whisper.cpp ne correspond pas à l’empreinte officielle."
        }
        $extracted = Join-Path $staging "whisper"
        Expand-Archive -LiteralPath $archive -DestinationPath $extracted
        $cli = Get-ChildItem -LiteralPath $extracted -Filter "whisper-cli.exe" -File -Recurse | Select-Object -First 1
        if (!$cli) { throw "whisper-cli.exe est absent de l’archive." }
        $binDirectory = Join-Path $toolsDirectory "bin"
        New-Item -Path $binDirectory -ItemType Directory -Force | Out-Null
        Get-ChildItem -LiteralPath $cli.DirectoryName -File | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $binDirectory -Force
        }
    }
    if (!(Test-Path -LiteralPath $modelFile) -or (Get-FileHash -LiteralPath $modelFile -Algorithm SHA1).Hash -ne $modelHash) {
        $download = Join-Path $staging "model.bin"
        curl.exe --fail --location --retry 2 --output $download "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=true"
        if ($LASTEXITCODE -ne 0) { throw "Téléchargement du modèle Whisper impossible." }
        if ((Get-FileHash -LiteralPath $download -Algorithm SHA1).Hash -ne $modelHash) {
            throw "Le modèle Whisper ne correspond pas à l’empreinte officielle."
        }
        Move-Item -LiteralPath $download -Destination $modelFile -Force
    }
    Write-Output "Whisper est prêt pour Highlights."
} finally {
    $resolvedStage = (Resolve-Path -LiteralPath $staging).Path
    $resolvedTools = (Resolve-Path -LiteralPath $toolsDirectory).Path
    if ($resolvedStage.StartsWith($resolvedTools + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
