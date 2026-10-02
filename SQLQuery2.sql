CREATE DATABASE [Tacos Mario´s];
GO

USE [Tacos Mario´s];
GO

CREATE TABLE dbo.users (
    userId int IDENTITY(1,1) PRIMARY KEY,
    userName varchar(50) NOT NULL UNIQUE,
    [password] varchar(255) NOT NULL,
    accountType tinyint NOT NULL CHECK (accountType IN (1, 2, 3)),
    isActive bit NOT NULL CONSTRAINT DF_users_isActive DEFAULT 1
);
GO