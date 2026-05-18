# Mirror https://php777.pro into the parent folder (project root).
$ErrorActionPreference = 'Stop'
$Base = 'https://php777.pro'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$sitemapPath = Join-Path $Root '_fetched\sitemap.xml'
if (-not (Test-Path (Split-Path $sitemapPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path $sitemapPath -Parent) -Force | Out-Null
}
& curl.exe -sL "$Base/sitemap.xml" -o $sitemapPath

[xml]$x = Get-Content -Raw $sitemapPath
$urls = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($n in $x.urlset.url) { [void]$urls.Add($n.loc.TrimEnd('/')) }
foreach ($extra in @(
        "$Base/regions.html",
        "$Base/philippines.html",
        "$Base/malaysia.html",
        "$Base/singapore.html",
        "$Base/index.html"
    )) { [void]$urls.Add($extra.TrimEnd('/')) }

function Get-LocalFile([string]$pageUrl) {
    $uri = [Uri]$pageUrl
    $p = $uri.AbsolutePath
    if ($p -eq '/' -or $p -eq '') { return Join-Path $Root 'index.html' }
    Join-Path $Root ($p.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar))
}

function Save-Url([string]$pageUrl, [string]$localPath) {
    $dir = Split-Path $localPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $code = 0
    & curl.exe -sfL --retry 2 -o $localPath $pageUrl 2>$null
    if ($LASTEXITCODE -ne 0) { $code = $LASTEXITCODE }
    if (-not (Test-Path $localPath) -or (Get-Item $localPath).Length -eq 0) {
        Write-Warning "Missing or empty: $pageUrl"
        if (Test-Path $localPath) { Remove-Item $localPath -Force -ErrorAction SilentlyContinue }
    }
}

Write-Host "Pages: $($urls.Count)"
foreach ($u in $urls) {
    Save-Url $u (Get-LocalFile $u)
}

$staticRel = @(
    'css/style.css',
    'js/load-partials.js',
    'partials/header.html',
    'partials/footer.html',
    'partials/cta-banner.html',
    'partials/sidebar.html',
    'favicon.svg',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'images/og-default.webp'
)
foreach ($rel in $staticRel) {
    $local = Join-Path $Root ($rel.Replace('/', [IO.Path]::DirectorySeparatorChar))
    Save-Url "$Base/$rel" $local
}

# Collect image (and same-host asset) paths from saved HTML
$assetSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$htmlFiles = Get-ChildItem -Path $Root -Filter '*.html' -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch [regex]::Escape([IO.Path]::DirectorySeparatorChar + '_fetched' + [IO.Path]::DirectorySeparatorChar) }

$hrefSrcRx = [regex]'(?i)(?:src|href)\s*=\s*"(?<u>[^"]+)"|(?:src|href)\s*=\s*''(?<u>[^'']+)'''
foreach ($hf in $htmlFiles) {
    $c = Get-Content -Raw -LiteralPath $hf.FullName
    foreach ($m in $hrefSrcRx.Matches($c)) {
        $v = $m.Groups['u'].Value
        if ($v -match '^(https?:)?//' -and $v -notmatch 'php777\.pro') { continue }
        if ($v -match '^mailto:|^tel:|^javascript:|^#') { continue }
        if ($v -match '^https?://(www\.)?php777\.pro') {
            $apath = ([Uri]$v).AbsolutePath.TrimStart('/')
            if ($apath -match '\.(webp|png|jpg|jpeg|gif|svg|ico)(\?.*)?$') { [void]$assetSet.Add($apath) }
            continue
        }
        $v = $v -replace '^\./', ''
        if ($v.StartsWith('/')) { $v = $v.TrimStart('/') }
        elseif ($v.StartsWith('../')) {
            $depth = ($hf.DirectoryName.Substring($Root.Length).Trim([IO.Path]::DirectorySeparatorChar).Split([IO.Path]::DirectorySeparatorChar) | Where-Object { $_ }).Count
            $up = $v
            while ($up.StartsWith('../')) {
                $up = $up.Substring(3)
                $depth--
            }
            $prefix = ''
            if ($depth -gt 0) {
                $parts = $hf.DirectoryName.Substring($Root.Length).Trim([IO.Path]::DirectorySeparatorChar).Split([IO.Path]::DirectorySeparatorChar) | Where-Object { $_ }
                $prefix = ($parts[0..([Math]::Max(0, $parts.Count - $depth - 1))] -join '/') + '/'
            }
            $v = if ($prefix) { "$prefix$up" } else { $up }
        }
        if ($v -match '^images/') { [void]$assetSet.Add($v) }
        elseif ($v -match '^(css|js|fonts)/.+\.[a-z0-9]{2,4}(\?.*)?$') { [void]$assetSet.Add(($v -replace '\?.*$','')) }
    }
}

Write-Host "Assets from HTML: $($assetSet.Count)"
foreach ($rel in $assetSet) {
    $clean = $rel -replace '\?.*$', ''
    $local = Join-Path $Root ($clean.Replace('/', [IO.Path]::DirectorySeparatorChar))
    if (Test-Path $local) { continue }
    Save-Url "$Base/$clean" $local
}

Copy-Item -LiteralPath $sitemapPath -Destination (Join-Path $Root 'sitemap.xml') -Force
Save-Url "$Base/robots.txt" (Join-Path $Root 'robots.txt')
& (Join-Path $PSScriptRoot 'fix-blog-images.ps1')

Write-Host "Mirror complete: $Root"
