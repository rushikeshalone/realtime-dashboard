-- ========================================
-- Real-Time Banking Dashboard Tables
-- ========================================

USE Rushi;
GO

-- Dashboard_CDRatioAnalysis
IF OBJECT_ID('Dashboard_CDRatioAnalysis') IS NULL 
BEGIN
    CREATE TABLE Dashboard_CDRatioAnalysis
    ( 
        CDRatioAnalysisId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        OrgElementId INT NOT NULL,
        BranchName VARCHAR(200) NOT NULL,
        Deposits MONEY NOT NULL,
        Loans MONEY NOT NULL,
        CDRatio MONEY NOT NULL,
        ReportDate DATETIME NOT NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        LastModifiedBy INT NULL,
        LastModifiedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_LiveTransactions
IF OBJECT_ID('Dashboard_LiveTransactions') IS NULL 
BEGIN
    CREATE TABLE Dashboard_LiveTransactions
    (
        LiveTransactionsId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        OrgElementId INT NOT NULL,
        BranchName NVARCHAR(200) NOT NULL,
        CustomerName NVARCHAR(200) NOT NULL,
        TransactionType NVARCHAR(50) NOT NULL,   
        TransactionAmount DECIMAL(18,2) NOT NULL,
        TransactionDate DATETIME NOT NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        LastModifiedBy INT NULL,
        LastModifiedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_BankPosition
IF OBJECT_ID('Dashboard_BankPosition') IS NULL 
BEGIN
    CREATE TABLE Dashboard_BankPosition
    (
        BankPositionId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        ReportDate DATETIME,
        OrgElementId INT,
        BranchName VARCHAR(512),
        AccountHeadId INT,
        AccountHeadName VARCHAR(512),
        OpeningBankPosition MONEY,
        CurrentBankPosition MONEY,
        LiabilityPosition MONEY,
        AssetPosition MONEY,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        LastModifiedBy INT NULL,
        LastModifiedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_CashPosition
IF OBJECT_ID('Dashboard_CashPosition') IS NULL 
BEGIN
    CREATE TABLE Dashboard_CashPosition
    (
        CashPositionId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        ReportDate DATETIME,
        OrgElementId INT,
        BranchName VARCHAR(512),
        OpeningCashPosition MONEY,
        CurrentCashPosition MONEY,
        DepositPosition MONEY,
        WithdrawlPosition MONEY,
        TotalCashPosition MONEY,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        LastModifiedBy INT NULL,
        LastModifiedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_LogedInUser
IF OBJECT_ID('Dashboard_LogedInUser') IS NULL 
BEGIN
    CREATE TABLE Dashboard_LogedInUser
    (
        LogedInUserId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        UserName VARCHAR(200) NOT NULL,
        UserRole VARCHAR(100) NOT NULL,
        BranchName VARCHAR(200) NOT NULL,
        LastLoginTime DATETIME NOT NULL,
        IsActive INT NOT NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        LastModifiedBy INT NULL,
        LastModifiedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_TopCards
IF OBJECT_ID('Dashboard_TopCards') IS NULL 
BEGIN
    CREATE TABLE Dashboard_TopCards
    (
        TopCardsId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        Particular VARCHAR(256) NOT NULL,
        Value VARCHAR(256) NOT NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL,
        DataType VARCHAR(256) NULL,
        IsActive INT
    ) 
END	
GO

-- Dashboard_DayEndStatus
IF OBJECT_ID('Dashboard_DayEndStatus') IS NULL 
BEGIN
    CREATE TABLE Dashboard_DayEndStatus
    (
        Dashboard_DayEndStatusId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        OrgElementId INT NOT NULL,
        BranchName VARCHAR(200) NOT NULL,
        LastDayEndDate DATETIME NULL,
        DayEndDoneBy VARCHAR(150) NULL,
        DayEndDoneAt DATETIME NULL,
        DayBeginBy VARCHAR(150) NULL,
        DayBeginAt DATETIME NULL,
        CurrentDate DATETIME NOT NULL DEFAULT GETDATE(),
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL
    ) 
END	
GO

-- Dashboard_Configurations
IF OBJECT_ID('Dashboard_Configurations') IS NULL 
BEGIN
    CREATE TABLE Dashboard_Configurations
    ( 
        CardName VARCHAR(256) NULL,
        TableName VARCHAR(256) NULL,
        ColumnName VARCHAR(256) NULL,
        DisplayName VARCHAR(256) NULL,
        IsDisplay INT DEFAULT 0,
        IsActive INT DEFAULT 0,
        Sequence INT NULL,
        UserId INT NULL,
        CreatedBy INT NULL,
        CreatedOn DATETIME NULL 
    ) 
END	
GO

-- Dashboard_AlertConfiguration
IF OBJECT_ID('Dashboard_AlertConfiguration') IS NULL
BEGIN
    CREATE TABLE Dashboard_AlertConfiguration
    (
        Dashboard_AlertConfiguration_AlertId INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        Title VARCHAR(200) NULL,
        Message VARCHAR(1000) NULL,
        AlertType VARCHAR(50) NULL,
        DisplayType VARCHAR(50) NULL,
        StartDate DATE NULL,
        EndDate DATE NULL,
        StartTime TIME NULL,
        EndTime TIME NULL,
        RepeatType VARCHAR(50) NULL,
        TargetUserId INT NULL,
        TargetRole VARCHAR(50) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        Priority INT NOT NULL DEFAULT 1,
        CreatedOn DATETIME NOT NULL DEFAULT GETDATE(),
        CreatedBy INT NULL
    )
END
GO
