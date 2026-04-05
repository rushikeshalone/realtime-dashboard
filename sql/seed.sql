-- ========================================
-- Seed / Dummy Data for Testing
-- ========================================

USE Rushi;
GO

-- Dashboard_TopCards
DELETE FROM Dashboard_TopCards;
INSERT INTO Dashboard_TopCards (Particular, Value, DataType, IsActive) VALUES
('Total Deposits', '45820000', 'CURRENCY', 1),
('Total Loans', '32150000', 'CURRENCY', 1),
('Net Profit', '8250000', 'CURRENCY', 1),
('Active Customers', '12847', 'NUMBER', 1),
('Today Transactions', '1456', 'NUMBER', 1),
('CD Ratio', '70.18', 'PERCENTAGE', 1);
GO

-- Dashboard_CDRatioAnalysis
DELETE FROM Dashboard_CDRatioAnalysis;
INSERT INTO Dashboard_CDRatioAnalysis (OrgElementId, BranchName, Deposits, Loans, CDRatio, ReportDate, CreatedBy, CreatedOn) VALUES
(1, 'Main Branch', 15000000, 10500000, 70.00, GETDATE(), 1, GETDATE()),
(2, 'North Branch', 8500000, 6200000, 72.94, GETDATE(), 1, GETDATE()),
(3, 'South Branch', 9200000, 6800000, 73.91, GETDATE(), 1, GETDATE()),
(4, 'East Branch', 7100000, 4900000, 69.01, GETDATE(), 1, GETDATE()),
(5, 'West Branch', 6020000, 3750000, 62.29, GETDATE(), 1, GETDATE());
GO

-- Dashboard_LiveTransactions
DELETE FROM Dashboard_LiveTransactions;
INSERT INTO Dashboard_LiveTransactions (OrgElementId, BranchName, CustomerName, TransactionType, TransactionAmount, TransactionDate, CreatedBy, CreatedOn) VALUES
(1, 'Main Branch', 'Rajesh Kumar', 'CREDIT', 25000.00, GETDATE(), 1, GETDATE()),
(2, 'North Branch', 'Priya Sharma', 'DEBIT', 12500.00, GETDATE(), 1, GETDATE()),
(1, 'Main Branch', 'Amit Patel', 'TRANSFER', 50000.00, GETDATE(), 1, GETDATE()),
(3, 'South Branch', 'Sunita Devi', 'CREDIT', 8000.00, GETDATE(), 1, GETDATE()),
(4, 'East Branch', 'Vikram Singh', 'DEBIT', 35000.00, GETDATE(), 1, GETDATE()),
(5, 'West Branch', 'Meena Joshi', 'CREDIT', 15000.00, GETDATE(), 1, GETDATE()),
(2, 'North Branch', 'Arun Mishra', 'TRANSFER', 100000.00, GETDATE(), 1, GETDATE()),
(1, 'Main Branch', 'Kavita Roy', 'DEBIT', 7500.00, GETDATE(), 1, GETDATE());
GO

-- Dashboard_BankPosition
DELETE FROM Dashboard_BankPosition;
INSERT INTO Dashboard_BankPosition (ReportDate, OrgElementId, BranchName, AccountHeadId, AccountHeadName, OpeningBankPosition, CurrentBankPosition, LiabilityPosition, AssetPosition, CreatedBy, CreatedOn) VALUES
(GETDATE(), 1, 'Main Branch', 101, 'Savings Account', 5000000, 5250000, 2000000, 8500000, 1, GETDATE()),
(GETDATE(), 1, 'Main Branch', 102, 'Current Account', 3000000, 3150000, 1500000, 5200000, 1, GETDATE()),
(GETDATE(), 2, 'North Branch', 101, 'Savings Account', 2500000, 2620000, 1000000, 4100000, 1, GETDATE()),
(GETDATE(), 3, 'South Branch', 101, 'Savings Account', 2800000, 2950000, 1200000, 4600000, 1, GETDATE()),
(GETDATE(), 4, 'East Branch', 103, 'Fixed Deposits', 1800000, 1890000, 800000, 3200000, 1, GETDATE());
GO

-- Dashboard_CashPosition
DELETE FROM Dashboard_CashPosition;
INSERT INTO Dashboard_CashPosition (ReportDate, OrgElementId, BranchName, OpeningCashPosition, CurrentCashPosition, DepositPosition, WithdrawlPosition, TotalCashPosition, CreatedBy, CreatedOn) VALUES
(GETDATE(), 1, 'Main Branch', 1500000, 1650000, 350000, 200000, 1650000, 1, GETDATE()),
(GETDATE(), 2, 'North Branch', 800000, 870000, 180000, 110000, 870000, 1, GETDATE()),
(GETDATE(), 3, 'South Branch', 950000, 1020000, 220000, 150000, 1020000, 1, GETDATE()),
(GETDATE(), 4, 'East Branch', 620000, 680000, 150000, 90000, 680000, 1, GETDATE()),
(GETDATE(), 5, 'West Branch', 450000, 490000, 100000, 60000, 490000, 1, GETDATE());
GO

-- Dashboard_LogedInUser
DELETE FROM Dashboard_LogedInUser;
INSERT INTO Dashboard_LogedInUser (UserName, UserRole, BranchName, LastLoginTime, IsActive, CreatedBy, CreatedOn) VALUES
('admin.banking', 'ADMIN', 'Head Office', DATEADD(MINUTE, -5, GETDATE()), 1, 1, GETDATE()),
('rajesh.teller', 'TELLER', 'Main Branch', DATEADD(MINUTE, -12, GETDATE()), 1, 1, GETDATE()),
('priya.manager', 'MANAGER', 'North Branch', DATEADD(MINUTE, -3, GETDATE()), 1, 1, GETDATE()),
('amit.officer', 'OFFICER', 'South Branch', DATEADD(MINUTE, -20, GETDATE()), 1, 1, GETDATE()),
('sunita.teller', 'TELLER', 'East Branch', DATEADD(MINUTE, -8, GETDATE()), 1, 1, GETDATE()),
('vikram.supervisor', 'SUPERVISOR', 'West Branch', DATEADD(HOUR, -1, GETDATE()), 0, 1, GETDATE());
GO

-- Dashboard_DayEndStatus
DELETE FROM Dashboard_DayEndStatus;
INSERT INTO Dashboard_DayEndStatus (OrgElementId, BranchName, LastDayEndDate, DayEndDoneBy, DayEndDoneAt, DayBeginBy, DayBeginAt, CurrentDate, CreatedBy, CreatedOn) VALUES
(1, 'Main Branch', DATEADD(DAY, -1, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'admin.banking', DATEADD(DAY, -1, DATEADD(HOUR, 18, CAST(CAST(GETDATE() AS DATE) AS DATETIME))), 'admin.banking', DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), GETDATE(), 1, GETDATE()),
(2, 'North Branch', DATEADD(DAY, -1, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'priya.manager', DATEADD(DAY, -1, DATEADD(HOUR, 17, CAST(CAST(GETDATE() AS DATE) AS DATETIME))), 'priya.manager', DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), GETDATE(), 1, GETDATE()),
(3, 'South Branch', DATEADD(DAY, -1, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'amit.officer', DATEADD(DAY, -1, DATEADD(HOUR, 18, CAST(CAST(GETDATE() AS DATE) AS DATETIME))), 'amit.officer', DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), GETDATE(), 1, GETDATE()),
(4, 'East Branch', NULL, NULL, NULL, NULL, NULL, GETDATE(), 1, GETDATE()),
(5, 'West Branch', DATEADD(DAY, -1, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'vikram.supervisor', DATEADD(DAY, -1, DATEADD(HOUR, 18, CAST(CAST(GETDATE() AS DATE) AS DATETIME))), 'vikram.supervisor', DATEADD(HOUR, 8, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), GETDATE(), 1, GETDATE());
GO

-- Dashboard_AlertConfiguration
DELETE FROM Dashboard_AlertConfiguration;
INSERT INTO Dashboard_AlertConfiguration (Title, Message, AlertType, DisplayType, StartDate, EndDate, StartTime, EndTime, RepeatType, TargetRole, IsActive, Priority, CreatedBy) VALUES
('System Maintenance', 'Server maintenance scheduled for tonight 10 PM - 11 PM. Please complete your transactions.', 'WARNING', 'BANNER', CAST(GETDATE() AS DATE), CAST(GETDATE() AS DATE), '09:00:00', '18:00:00', 'ONCE', NULL, 1, 1, 1),
('Happy Birthday 🎉', 'Wishing team members a wonderful birthday!', 'BIRTHDAY', 'MODAL', CAST(GETDATE() AS DATE), CAST(GETDATE() AS DATE), '09:00:00', '17:00:00', 'YEARLY', NULL, 1, 2, 1),
('Daily Report Reminder', 'Please submit your end-of-day reports before 5:30 PM.', 'INFO', 'TOAST', CAST(GETDATE() AS DATE), CAST(DATEADD(YEAR, 1, GETDATE()) AS DATE), '16:00:00', '17:30:00', 'DAILY', 'MANAGER', 1, 2, 1);
GO
