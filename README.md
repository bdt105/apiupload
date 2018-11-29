# apifs

Based on nodejs and express.
Write, read, delete a file.
The file is create in a directory. If directory does not exist then it is created.

## Dependencies
https://github.com/bdt105/modules/tree/master/toolbox

## Configuration
Configure configuration.json if you wish to change port.

## POST /
Reads a file.
If fileName is empty or absent then the api retreives the list of files of the directory.
``offset`` and ``limit`` must be integers, both must be present or both are ignored.
``searchParams`` allow to search with the table of results, default values are those in the example.


```
POST example
{
	"directory": "directory",
	"fileName": "test.txt",
	"offset": 2,
	"limit": 5,
	"searchParams": {
		"keySearch": "", 
		"keyValue": "",
        "caseSensitive": false, 
		"accentSensitive": false, 
		"exactMatching": true, 
		"include": false,
		"allFields": false
	}
}
```

## DELETE /
Deletes a file

```
POST example
{
	"directory": "directory",
	"fileName": "test.txt"
}
```

## PUT /
Writes a file

```
POST example
{
	"directory": "directory",
	"fileName": "test.txt",
    "content": "toto xxx fffd"
}
```

## PATCH /
Appends content at the end of a file

```
POST example
{
	"directory": "directory",
	"fileName": "test.txt",
    "content": "toto xxx fffd"
}
```