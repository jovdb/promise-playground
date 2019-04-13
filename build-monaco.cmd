@ECHO OFF

REM https://github.com/Microsoft/monaco-editor/blob/master/docs/integrate-esm.md#using-parcel

REM ECHO Building JSON Worker...
REM CALL "%~p0node_modules\.bin\parcel.cmd" build "%~p0node_modules\monaco-editor\esm\vs\language\json\json.worker.js" --no-source-maps --log-level 1 --out-dir "%~p0docs\monaco"
REM 
REM ECHO Building CSS Worker...
REM CALL "%~p0node_modules\.bin\parcel.cmd" build "%~p0node_modules\monaco-editor\esm\vs\language\css\css.worker.js" --no-source-maps --log-level 1 --out-dir "%~p0docs\monaco"
REM 
REM ECHO Building HTML Worker...
REM CALL "%~p0node_modules\.bin\parcel.cmd" build "%~p0node_modules\monaco-editor\esm\vs\language\html\html.worker.js" --no-source-maps --log-level 1 --out-dir "%~p0docs\monaco"


ECHO Building Typescript Worker...
CALL "%~p0node_modules\.bin\parcel.cmd" build "%~p0node_modules\monaco-editor\esm\vs\language\typescript\ts.worker.js" --no-source-maps --log-level 1 --out-dir "%~p0docs\monaco"

ECHO Building Editor Worker...
CALL "%~p0node_modules\.bin\parcel.cmd" build "%~p0node_modules\monaco-editor\esm\vs\editor\editor.worker.js" --no-source-maps --log-level 1 --out-dir "%~p0docs\monaco"

@ECHO ON
COPY "%~p0docs\monaco\*.*" "%~p0src\editor\monaco\"