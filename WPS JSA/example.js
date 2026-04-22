/**
 * @example 示例1：获取A1单元格的当前所属区域
 * let currentRegion = Application.ActiveSheet.Range("A1").CurrentRegion;
 * 
 * @example 示例2：获取A1:C10单元格的当前值
 * let currentValue = Application.ActiveSheet.Range("A1:C10").Value2;
 * let currentValue2 = Application.ActiveSheet.Range("A1:C10")(); // 等价于Value2
 * 
 * @example 示例3：在A1单元格中输入一个数组，根据数组的长和宽自动调整单元格的大小
 * let array = [["value1", "value2"], ["value3", "value4"]];
 * Application.ActiveSheet.Range("A1").Resize(array.length, array[0].length).Value2 = array;
 * 
 * @example 示例4：获取A1单元格的行号和列号
 * let row = Application.ActiveSheet.Range("A1").Row;
 * let column = Application.ActiveSheet.Range("A1").Column;
 * 
 * @example 示例5：获取A1单元格的向右偏移1列向下偏移3行的单元格
 * let cell = Application.ActiveSheet.Range("A1").Offset(3, 1);
 * 
 * @example 示例6：复制A1:B19单元格的内容到C2:D20单元格
 * Application.ActiveSheet.Range("A1:B19").Copy();
 * Application.ActiveSheet.Range("C2:D20").PasteSpecial(xlPasteAll);
 * 
 * @example 示例7：获取当前选定区域
 * let selectedRange = Application.Selection;
 * 
 * @example 示例8：获取当前工作表的名称
 * let sheetName = Application.ActiveSheet.Name;
 * 
 * @example 示例9：获取当前工作表的索引
 * let sheetIndex = Application.ActiveSheet.Index;
 * 
 * @example 示例10：添加一个新的工作表并设置名称
 * let newSheet = Application.ActiveWorkbook.Sheets.Add();
 * newSheet.Name = "新工作表";
 * 
 * @example 示例11：删除当前工作表
 * Application.ActiveSheet.Delete();
 * 
 * @example 示例12：保护当前工作表
 * let sheetProtectOptions = { AllowDeletingColumns: true, AllowDeletingRows: true, AllowFiltering: true, AllowFormattingCells: true, AllowFormattingColumns: true, AllowFormattingRows: true, AllowInsertingColumns: true, AllowInsertingRows: true, AllowSorting: true, AllowUsingPivotTables: true, Password: "password", DrawingObjects: true, Contents: true, Scenarios: true, UserInterfaceOnly: true };
 * Application.ActiveSheet.Protect(sheetProtectOptions);
 * 
 * @example 示例13：解除当前工作表的保护
 * Application.ActiveSheet.Unprotect("password");
 * 
 * @example 示例14：获取当前工作表的行数和列数
 * let rowCount = Application.ActiveSheet.Rows.Count;
 * let columnCount = Application.ActiveSheet.Columns.Count;
 * 
 * @example 示例15：获取当前工作表的已使用区域
 * let usedRange = Application.ActiveSheet.UsedRange;
 * 
 * @example 示例16：获取当前工作表的合并区域
 * let mergedCells = Application.ActiveSheet.UsedRange.MergeCells;
 * 
 * @example 示例17：获取当前工作表的打印区域
 * let printArea = Application.ActiveSheet.PageSetup.PrintArea;
 * 
 * @example 示例18：设置当前工作表的打印区域
 * Application.ActiveSheet.PageSetup.PrintArea = "A1:B19";
 * 
 * @example 示例19：关闭当前工作表
 * Application.ActiveSheet.Close(false); // 关闭当前工作表，不保存
 * 
 * @example 示例20：获取当前工作簿的名称
 * let workbookName = Application.ActiveWorkbook.Name 
 * 
 * @example 示例21：获取当前工作簿的路径
 * let workbookPath = Application.ActiveWorkbook.Path;
 * 
 * @example 示例22：获取当前工作簿的工作表数量
 * let sheetCount = Application.ActiveWorkbook.Sheets.Count;
 * 
 * @example 示例23：保存当前工作簿
 * Application.ActiveWorkbook.Save();
 * 
 * @example 示例24：另存为当前工作簿
 * Application.ActiveWorkbook.SaveAs("C:\\Users\\yourusername\\Desktop\\另存为的工作簿名称.xlsx");
 * 
 * @example 示例25：关闭当前工作簿
 * Application.ActiveWorkbook.Close(false); // 关闭当前工作簿，不保存
 * 
 * @example 示例26：对A1:H21单元格进行筛选
 * Application.ActiveSheet.Range("A1:H21").AutoFilter(2, ["value1", "value2"], xlFilterValues);
 * 
 * @example 示例27：对当前筛选区域（假设为A1:H21）进行排序，排序依据为D列，降序排列
 * Application.ActiveSheet.AutoFilter.Sort.SortFields.Add(Application.ActiveSheet.Range("D2:D21"), xlSortOnValues, xlDescending, xlPinYin);
 * Application.ActiveSheet.AutoFilter.Sort.Apply();
 * 
 * @example 示例28：创建WPS对象
 * let wpsApp = CreateObject("kwps.application");
 * 
/**
 * @example 示例29：创建WPS文档对象
 * let wpsDoc = wpsApp.Documents.Add();
 */

/**
 * @example 示例30：在A1：K20区域的每个单元格中输入随机数（0-100）
 * function fillRandomArray() {
 *		// 生成一个对应大小的数组来存放随机数并填入单元格区域，获取单元格区域的行数和列数以确定填入数组的大小
 *		let rowCount = Application.ActiveSheet.Range("A1:K20").Rows.Count;
 *		let columnCount = Application.ActiveSheet.Range("A1:K20").Columns.Count;
 *		// 定义一个数组，用于存放随机数
 *		let randomArray = [];
 *		// 循环生成随机数，并填入数组
 *		for (let i = 0; i < rowCount; i++) {
 *			let rowArray = [];
 *			for (let j = 0; j < columnCount; j++) {
 *				// 生成0到100之间的随机整数
 *				rowArray.push(Math.floor(Math.random() * 101));
 *			}
 *			// 将生成的行数组添加到主数组中
 *			randomArray.push(rowArray);
 *		}
 *		// 填入数组到单元格区域（A1:K20）
 *		Application.ActiveSheet.Range("A1:K20").Value2 = randomArray;
 * }
 * // 调用函数填充随机数
 * fillRandomArray();
 */

/**
 * @example 示例31：对A1：K20单元格的值进行逐行求和，每行的第一个值累加1次，第二个值累加2次，以此类推，输出到L列（L1开始）
 * function sumRow() {
 *		// 获取单元格区域的值
 *		let valueArray = Application.ActiveSheet.Range("A1:K20").Value2;
 *		// 定义一个数组，用于存放累加值
 *		let sumArray = [];
 *		// 循环遍历每行的值，并累加
 *		for (let i = 0; i < valueArray.length; i++) {
 *			let sum = 0;
 *			for (let j = 0; j < valueArray[i].length; j++) {
 *				// 每行的第一个值累加1次，第二个值累加2次，以此类推
 *				sum += valueArray[i][j] * (j + 1);
 *			}
 *			// 输出区域为L1：L20，输出前需要把sumArray输出为二维数组，每行一个元素
 *			sumArray.push([sum]);
 *		}
 *		// 输出累加值到单元格区域（确定起始位置为L1，使用Resize调整单元格大小）
 *		Application.ActiveSheet.Range("L1").Resize(sumArray.length, 1).Value2 = sumArray;
 * }
 * // 调用函数进行逐行求和
 * sumRow();
 */
