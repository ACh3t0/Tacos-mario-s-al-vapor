IF DB_ID(N'Tacos Mario´s') IS NULL
    CREATE DATABASE [Tacos Mario´s];
GO

USE [Tacos Mario´s];
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        userId int IDENTITY(1,1) PRIMARY KEY,
        userName varchar(50) NOT NULL UNIQUE,
        [password] varchar(255) NOT NULL,
        accountType tinyint NOT NULL CHECK (accountType IN (1, 2, 3)),
        isActive bit NOT NULL CONSTRAINT DF_users_isActive DEFAULT 1
    );
END
ELSE IF COL_LENGTH(N'dbo.users', N'isActive') IS NULL
BEGIN
    ALTER TABLE dbo.users
    ADD isActive bit NOT NULL CONSTRAINT DF_users_isActive DEFAULT 1;
END
GO

-- Inventario de productos terminados disponibles para vender.
IF OBJECT_ID(N'dbo.inventario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.inventario (
        productoId int IDENTITY(1,1) PRIMARY KEY,
        nombre nvarchar(100) NOT NULL,
        descripcion nvarchar(255) NULL,
        unidad nvarchar(20) NOT NULL CONSTRAINT DF_inventario_unidad DEFAULT N'pieza',
        existencia decimal(12,3) NOT NULL CONSTRAINT DF_inventario_existencia DEFAULT 0,
        stockMinimo decimal(12,3) NOT NULL CONSTRAINT DF_inventario_stockMinimo DEFAULT 0,
        precioVenta decimal(12,2) NOT NULL,
        isActive bit NOT NULL CONSTRAINT DF_inventario_isActive DEFAULT 1,
        CONSTRAINT CK_inventario_existencia CHECK (existencia >= 0),
        CONSTRAINT CK_inventario_stockMinimo CHECK (stockMinimo >= 0),
        CONSTRAINT CK_inventario_precioVenta CHECK (precioVenta >= 0)
    );
END
GO

-- Encabezado: fecha, usuario responsable y forma de pago.
IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas (
        ventaId int IDENTITY(1,1) PRIMARY KEY,
        fecha datetime2(0) NOT NULL CONSTRAINT DF_ventas_fecha DEFAULT SYSDATETIME(),
        userId int NOT NULL,
        metodoPago nvarchar(20) NOT NULL,
        CONSTRAINT FK_ventas_users FOREIGN KEY (userId) REFERENCES dbo.users(userId),
        CONSTRAINT CK_ventas_metodoPago CHECK (metodoPago IN (N'Efectivo', N'Tarjeta', N'Transferencia'))
    );
END
GO

-- Cada fila representa un producto vendido. Conserva el precio de esa venta.
IF OBJECT_ID(N'dbo.detalleVenta', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalleVenta (
        detalleVentaId int IDENTITY(1,1) PRIMARY KEY,
        ventaId int NOT NULL,
        productoId int NOT NULL,
        cantidad decimal(12,3) NOT NULL,
        precioUnitario decimal(12,2) NOT NULL,
        subtotal AS CAST(ROUND(cantidad * precioUnitario, 2) AS decimal(24,2)) PERSISTED,
        CONSTRAINT FK_detalleVenta_ventas FOREIGN KEY (ventaId) REFERENCES dbo.ventas(ventaId),
        CONSTRAINT FK_detalleVenta_inventario FOREIGN KEY (productoId) REFERENCES dbo.inventario(productoId),
        CONSTRAINT CK_detalleVenta_cantidad CHECK (cantidad > 0),
        CONSTRAINT CK_detalleVenta_precioUnitario CHECK (precioUnitario >= 0)
    );

    CREATE INDEX IX_detalleVenta_ventaId ON dbo.detalleVenta(ventaId);
    CREATE INDEX IX_detalleVenta_productoId ON dbo.detalleVenta(productoId);
END
GO

-- El total de una venta se obtiene con SUM(subtotal) de su detalleVenta.
-- Al registrar una venta, el backend debe insertar su detalle y descontar
-- existencias en una misma transaccion, comprobando que haya stock suficiente.
