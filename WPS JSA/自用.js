function Workbook_AfterSave(Success){
  
    // 工作表保护密码
    const shtPwd = "HANJ";

    if (!Success) return;

    Application.ScreenUpdating = false;
    Application.EnableEvents = false;

    const sheetName = "日志";
    let targetSheet = null;
    const shts = ThisWorkbook.Sheets;
    const xlUp = -4162;

    // 弹出可选备注输入框
    let inputDesc = InputBox("本次保存备注（可不填）：", "保存日志备注", "");

    // 查找日志工作表
    for(let i = 1; i <= shts.Count; i++){
        let s = shts(i);
        if (s.Name === sheetName){
            targetSheet = s;
            break;
        }
    }

    // 时间格式化 YYYMMDD HH-MM-SS
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    const h = now.getHours().toString().padStart(2, "0");
    const mi = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");
    const saveTimeText = `${y}${m}${d} ${h}-${mi}-${ss}`;

    const userName = Application.UserName;
    const fileFullPath = ThisWorkbook.FullName;

    // 新建日志表初始化
    if (!targetSheet){
        targetSheet = shts.Add();
        targetSheet.Name = sheetName;

        // 固定头部信息
        targetSheet.Cells(1, 1).Value2 = "作者：韩杰，邮箱：hanj1998@foxmail.com";
        targetSheet.Cells(2, 1).Value2 = "保存时间";
        targetSheet.Cells(2, 2).Value2 = "说明";
        targetSheet.Cells(2, 3).Value2 = "操作人";
        targetSheet.Cells(2, 4).Value2 = "文件路径";

        // 冻结前两行
        targetSheet.Activate();
        ActiveWindow.FreezePanes = false;
        targetSheet.Rows("3:3").Select();
        ActiveWindow.FreezePanes = true;

        // 表头样式
        let headerRng = targetSheet.Range("A2:D2");
        headerRng.Font.Bold = true;
        headerRng.Interior.Color = 14277081;

        // 锁定设置：1-2行保护，下方可编辑
        targetSheet.Range("A:D").Locked = false;
        targetSheet.Rows("1:2").Locked = true;

        // 工作表保护：禁止删除、禁止改名
        targetSheet.Protect(shtPwd, false, true, true);
    }

    // 解除保护写入数据
    if(targetSheet.ProtectContents){
        targetSheet.Unprotect(shtPwd);
    }

    // 获取最后一行，追加日志
    const lastRow = targetSheet.Cells(targetSheet.Rows.Count, 1).End(xlUp).Row;
    const writeRow = lastRow < 3 ? 3 : lastRow + 1;

    targetSheet.Cells(writeRow, 1).Value2 = saveTimeText;
    targetSheet.Cells(writeRow, 2).Value2 = inputDesc;
    targetSheet.Cells(writeRow, 3).Value2 = userName;
    targetSheet.Cells(writeRow, 4).Value2 = fileFullPath;
    targetSheet.Range(`A${writeRow}:D${writeRow}`).HorizontalAlignment = -4131;

    // ========== 修复：每次保存强制自动调整ABCD列宽 ==========
    targetSheet.Range("A:D").Columns.AutoFit();

    // 重新加密保护
    targetSheet.Protect(shtPwd, false, true, true);

    // 消除WPS未保存标记
    ThisWorkbook.Saved = true;

    Application.ScreenUpdating = true;
    Application.EnableEvents = true;
}
function 名称批量_导出导入() {
  
    Application.ScreenUpdating = false;
    Application.EnableEvents = false;

    let allWbs = [];
    for (let i = 1; i <= Workbooks.Count; i++) {
        allWbs.push({
            name: Workbooks(i).Name,
            wb: Workbooks(i)
        });
    }

    if (allWbs.length < 2) {
        MsgBox("至少需要打开两个表格文件才能进行导入导出！");
        // 内嵌恢复
        Application.ScreenUpdating = true;
        Application.EnableEvents = true;
        return;
    }

    // 开关1：保留临时表
    let keepSheetIn = InputBox("是否保留【名称导出/名称导入】临时工作表？\n1=保留  2=自动删除", "临时表开关", "2");
    const KEEP_TEMP_SHEET = keepSheetIn === "1";

    // 开关2：重名覆盖
    let overwriteIn = InputBox("遇到重名名称如何处理？\n1=强制覆盖  2=跳过重名", "重名处理开关", "2");
    const OVERWRITE_EXIST = overwriteIn === "1";

    // 选择来源文件
    let srcTip = "请输入【源文件】序号：\n";
    for (let i = 0; i < allWbs.length; i++) {
        srcTip += `${i + 1}. ${allWbs[i].name}\n`;
    }
    let srcInput = InputBox(srcTip, "选择来源文件", "1");
    let srcIndex = parseInt(srcInput);
    if (isNaN(srcIndex) || srcIndex < 1 || srcIndex > allWbs.length) {
        MsgBox("序号输入错误，操作终止");
        Application.ScreenUpdating = true;
        Application.EnableEvents = true;
        return;
    }
    let srcWB = allWbs[srcIndex - 1].wb;

    // 选择目标文件
    let desTip = "请输入【目标文件】序号：\n";
    for (let i = 0; i < allWbs.length; i++) {
        desTip += `${i + 1}. ${allWbs[i].name}\n`;
    }
    let desInput = InputBox(desTip, "选择目标文件", "2");
    let desIndex = parseInt(desInput);
    if (isNaN(desIndex) || desIndex < 1 || desIndex > allWbs.length) {
        MsgBox("序号输入错误，操作终止");
        Application.ScreenUpdating = true;
        Application.EnableEvents = true;
        return;
    }
    let desWB = allWbs[desIndex - 1].wb;

    if (srcWB.Name === desWB.Name) {
        MsgBox("源文件和目标文件不能为同一个文件");
        Application.ScreenUpdating = true;
        Application.EnableEvents = true;
        return;
    }

    // 1. 导出来源名称
    let tempExportWS = null;
    try { srcWB.Worksheets("名称导出").Delete(); } catch (e) {}
    tempExportWS = srcWB.Worksheets.Add();
    tempExportWS.Name = "名称导出";

    tempExportWS.Range("A1").Value2 = "名称";
    tempExportWS.Range("B1").Value2 = "引用位置";
    tempExportWS.Range("C1").Value2 = "范围";
    tempExportWS.Range("D1").Value2 = "备注";

    let names = srcWB.Names;
    let row = 2;
    for (let i = 1; i <= names.Count; i++) {
        let n = names(i);
        if (n.Name.indexOf("_FilterDatabase") > -1) continue;

        tempExportWS.Cells(row, 1).Value2 = n.Name;
        tempExportWS.Cells(row, 2).Value2 = "\"" + n.RefersTo + "\"";
        tempExportWS.Cells(row, 3).Value2 = n.Visible ? "工作簿" : "工作表";
        tempExportWS.Cells(row, 4).Value2 = n.Comment;
        row++;
    }
    tempExportWS.Columns("A:D").AutoFit();

    // 2. 导入到目标文件
    let importWS = null;
    try { desWB.Worksheets("名称导入").Delete(); } catch (e) {}
    importWS = desWB.Worksheets.Add();
    importWS.Name = "名称导入";

    let copyRow = 1;
    while (tempExportWS.Cells(copyRow, 1).Text !== "" || tempExportWS.Cells(copyRow, 2).Text !== "") {
        importWS.Cells(copyRow, 1).Value2 = tempExportWS.Cells(copyRow, 1).Value2;
        importWS.Cells(copyRow, 2).Value2 = tempExportWS.Cells(copyRow, 2).Value2;
        importWS.Cells(copyRow, 3).Value2 = tempExportWS.Cells(copyRow, 3).Value2;
        importWS.Cells(copyRow, 4).Value2 = tempExportWS.Cells(copyRow, 4).Value2;
        copyRow++;
    }
    importWS.Columns("A:D").AutoFit();

    // 批量写入名称
    row = 2;
    let skipCount = 0;
    while (importWS.Cells(row, 1).Text !== "") {
        let nameStr = importWS.Cells(row, 1).Text.trim();
        let refText = importWS.Cells(row, 2).Text;
        let commentText = importWS.Cells(row, 4).Text;

        if (nameStr === "") {
            row++;
            continue;
        }
        refText = refText.replace(/^"/, "").replace(/"$/, "");

        let hasSame = false;
        try {
            desWB.Names(nameStr);
            hasSame = true;
        } catch (e) {
            hasSame = false;
        }

        if (hasSame) {
            if (OVERWRITE_EXIST) {
                try { desWB.Names(nameStr).Delete(); } catch (e) {}
            } else {
                skipCount++;
                row++;
                continue;
            }
        }

        try {
            let newName = desWB.Names.Add(nameStr, refText);
            newName.Comment = commentText;
        } catch (e) {}
        row++;
    }

    // 清理临时表
    if (!KEEP_TEMP_SHEET) {
        try { tempExportWS.Delete(); } catch (e) {}
        try { importWS.Delete(); } catch (e) {}
    }

    // 完成提示
    let msg = "名称迁移完成！\n来源：" + srcWB.Name + "\n目标：" + desWB.Name;
    if (!OVERWRITE_EXIST && skipCount > 0) {
        msg += "\n已跳过重名数量：" + skipCount + " 条";
    }
    MsgBox(msg);

    // 统一收尾复原（合并内嵌，无独立函数）
    Application.ScreenUpdating = true;
    Application.EnableEvents = true;
}