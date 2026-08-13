$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime] | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
Function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { throw "NO_OCR_ENGINE" }

$dir = Join-Path $PSScriptRoot ("Cat" + [char]0xE1 + "logo")
if (-not (Test-Path $dir)) { throw "NO_CARPETA_CATALOGO" }

$files = Get-ChildItem -Path $dir -File -Filter *.jpeg | Sort-Object Name
$results = @()
foreach ($f in $files) {
  try {
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $text = ($result.Lines | ForEach-Object { $_.Text }) -join " | "
    $results += [PSCustomObject]@{ file = $f.Name; ocr = $text }
  } catch {
    $results += [PSCustomObject]@{ file = $f.Name; ocr = "ERROR: $($_.Exception.Message)" }
  }
}
$json = $results | ConvertTo-Json -Depth 3
$out = Join-Path $PSScriptRoot "ocr-datos.json"
[System.IO.File]::WriteAllText($out, $json, [System.Text.Encoding]::UTF8)
Write-Output "OK -> $out ($($results.Count) imagenes)"
