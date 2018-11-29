ps -ef | grep 'serverApiUpload.js' | grep -v grep | awk '{print $2}' | xargs kill -9 1> serverApiUploadKillLog.out 2> serverApiUploadKillErr.out
cd ./build
node serverApiUpload.js 1> serverApiUploadLog.out 2> serverApiUploadErr.out &