function 新建并保存工作表() {
  for (let name of Range("A1:A10").Value()) {
    Workbook.Add();
    ActiveWorkbook.SaveAs("D:\\桌面\\test\\" + name + ".xlsx");
    ActiveWorkbook.Close();
  }
}
