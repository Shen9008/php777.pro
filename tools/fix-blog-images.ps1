$root = Split-Path -Parent $PSScriptRoot
$blog = Join-Path $root 'blog'
Get-ChildItem -Path $blog -Filter '*.html' -File | ForEach-Object {
    $p = $_.FullName
    $c = [System.IO.File]::ReadAllText($p)
    $n = $c -replace 'src="/images/', 'src="../images/'
    if ($n -ne $c) {
        [System.IO.File]::WriteAllText($p, $n)
    }
}
$s = Join-Path $root '_fetched\sitemap.xml'
if (Test-Path $s) {
    Copy-Item $s (Join-Path $root 'sitemap.xml') -Force
}
Write-Host 'Blog image paths updated.'
