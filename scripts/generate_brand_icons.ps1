Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot '..\public'
$source = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot '..\assets\brand\yuelao-shadow-source.png'))
foreach ($size in @(32,64,180,192,512)) {
  $resized = [System.Drawing.Bitmap]::new($size,$size)
  $graphics = [System.Drawing.Graphics]::FromImage($resized)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source,0,0,$size,$size)
  $filename = switch ($size) {
    32 { 'favicon-yuelao-v2.png' }
    64 { 'favicon-yuelao-v2-64.png' }
    180 { 'apple-touch-icon-yuelao-v2.png' }
    default { "icon-yuelao-v2-$size.png" }
  }
  $resized.Save((Join-Path $assetRoot $filename),[System.Drawing.Imaging.ImageFormat]::Png)
  if ($size -in @(180,192,512)) {
    $legacy = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
    $resized.Save((Join-Path $assetRoot $legacy),[System.Drawing.Imaging.ImageFormat]::Png)
    $prior = if ($size -eq 180) { 'apple-touch-icon-yuelao-v1.png' } else { "icon-yuelao-v1-$size.png" }
    $resized.Save((Join-Path $assetRoot $prior),[System.Drawing.Imaging.ImageFormat]::Png)
  }
  $graphics.Dispose(); $resized.Dispose()
}
$source.Dispose()
$encoded = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $assetRoot 'favicon-yuelao-v2-64.png')))
$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,' + $encoded + '"/></svg>'
[IO.File]::WriteAllText((Join-Path $assetRoot 'favicon.svg'),$svg,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $assetRoot 'favicon-yuelao-v1.svg'),$svg,[Text.UTF8Encoding]::new($false))
Write-Output 'Generated text-free shadow-puppet icons: 32, 64, 180, 192 and 512 pixels.'

