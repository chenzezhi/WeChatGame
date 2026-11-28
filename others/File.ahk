; File.ahk - 文件操作的函数库
#Requires AutoHotkey v2.0

; 读取文件内容到数组
; filePath - 文件路径
; separator - 分隔符，默认空格
; commentChar - 注释符，默认#号
; 返回一个二维数组
ReadFileToArray(filePath, separator:=" ",commentChar:="#") {
  ; 定义一个空数组用于存储文件内容
  arr := [] 
  Loop Read filePath {
    ; 用注释符分割，取前半部分
    temp := StrSplit(A_LoopReadLine,commentChar)[1] 
    ; 空行和只有注释的行跳过
    if( A_LoopReadLine = "" || temp = "" ){ 
      continue
    }
    ; 去除前后空格
    temp := Trim(temp) 
    arr.push(StrSplit(temp, separator)) ; 再按分隔符切割存入数组
  }
  return arr
}

ReadFileToString(filePath){
  ; 以读写方式打开文件，返回文件对象fo
  fo := FileOpen(filePath,"rw") 
  str := fo.read()
  fo.close()
  return str
}

; 重写文件：删除文件后再写入，并提示
; text - 要写入的文本
; filePath - 文件路径
WriteFileOn(text,filePath){
  ; 检查文件是否存在
  if(FileExist(filePath)){ 
    ; 永久删除"操作集.txt"
    FileDelete(filePath) 
  }
  ; 以"UTF-8"编码格式将mapping追加到"fileName"文件末尾
  FileAppend(text,filePath,"UTF-8") 
  ; 提示用户
  ToolTip "已重写入文件：" filePath
  Sleep 1000
  ToolTip
}