IF DB_ID(N'Tacos Marios') IS NULL
    CREATE DATABASE [Tacos Marios];
GO

USE [Tacos Marios];
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

-- Agrega el catálogo inicial sin modificar productos que ya existan.
-- Corrige la unidad provisional de los productos existentes.
UPDATE dbo.inventario
SET unidad = N'pieza'
WHERE LOWER(LTRIM(RTRIM(unidad))) = N'pendiente';
GO

DECLARE @catalogo TABLE (
    nombre nvarchar(100) NOT NULL,
    precioVenta decimal(12,2) NOT NULL
);

INSERT INTO @catalogo (nombre, precioVenta)
VALUES
    (N'Taco de papa', 11.00),
    (N'Taco de Deshebrada', 11.00),
    (N'Taco de Chicharron', 11.00),
    (N'Taco de Frijol', 11.00),
    (N'Orden mixta (5 tacos)', 55.00),
    (N'Joya de manzana (355 ml)', 20.00),
    (N'Joya de ponche (355 ml)', 20.00),
    (N'Joya de durazno (355 ml)', 20.00),
    (N'Coca-cola regular (355 ml)', 20.00),
    (N'Coca-cola zero (355 ml)', 20.00);

INSERT INTO dbo.inventario (nombre, unidad, existencia, stockMinimo, precioVenta, isActive)
SELECT catalogo.nombre, N'pieza', 0, 0, catalogo.precioVenta, 1
FROM @catalogo AS catalogo
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.inventario AS existente
    WHERE existente.nombre = catalogo.nombre
);
GO

-- Encabezado: fecha, usuario responsable y forma de pago.
IF OBJECT_ID(N'dbo.ventas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ventas (
        ventaId int IDENTITY(1,1) PRIMARY KEY,
        fecha datetime2(0) NOT NULL CONSTRAINT DF_ventas_fecha DEFAULT SYSDATETIME(),
        userId int NOT NULL,
        metodoPago nvarchar(20) NOT NULL,
        estadoPedido nvarchar(12) NOT NULL CONSTRAINT DF_ventas_estadoPedido DEFAULT N'Activo',
        CONSTRAINT FK_ventas_users FOREIGN KEY (userId) REFERENCES dbo.users(userId),
        CONSTRAINT CK_ventas_metodoPago CHECK (metodoPago IN (N'Efectivo', N'Tarjeta', N'Transferencia')),
        CONSTRAINT CK_ventas_estadoPedido CHECK (estadoPedido IN (N'Activo', N'Completado'))
    );
END
GO

-- Conserva las ventas existentes como completadas.
IF COL_LENGTH(N'dbo.ventas', N'estadoPedido') IS NULL
BEGIN
    ALTER TABLE dbo.ventas
    ADD estadoPedido nvarchar(12) NOT NULL
        CONSTRAINT DF_ventas_estadoPedido DEFAULT N'Completado' WITH VALUES;
END
GO

-- El DEFAULT se separa en otro lote para que SQL Server ya conozca la columna.
DECLARE @defaultEstadoPedido sysname;
SELECT @defaultEstadoPedido = dc.name
FROM sys.default_constraints AS dc
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.ventas')
    AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'dbo.ventas'), N'estadoPedido', 'ColumnId');

IF @defaultEstadoPedido IS NOT NULL
BEGIN
    DECLARE @sqlEliminarDefault nvarchar(max) =
        N'ALTER TABLE dbo.ventas DROP CONSTRAINT ' + QUOTENAME(@defaultEstadoPedido);
    EXEC sys.sp_executesql @sqlEliminarDefault;
END
GO

DECLARE @sqlAgregarDefault nvarchar(max) =
    N'ALTER TABLE [dbo].[ventas] ADD CONSTRAINT [DF_ventas_estadoPedido] ' +
    N'DEFAULT N''Activo'' FOR [estadoPedido]';
EXEC sys.sp_executesql @sqlAgregarDefault;
GO

IF OBJECT_ID(N'dbo.CK_ventas_estadoPedido', N'C') IS NULL
BEGIN
    ALTER TABLE dbo.ventas
    ADD CONSTRAINT CK_ventas_estadoPedido
        CHECK (estadoPedido IN (N'Activo', N'Completado'));
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

END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.detalleVenta')
        AND name = N'IX_detalleVenta_ventaId'
)
    EXEC sys.sp_executesql
        N'CREATE INDEX [IX_detalleVenta_ventaId] ON [dbo].[detalleVenta] ([ventaId])';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.detalleVenta')
        AND name = N'IX_detalleVenta_productoId'
)
    EXEC sys.sp_executesql
        N'CREATE INDEX [IX_detalleVenta_productoId] ON [dbo].[detalleVenta] ([productoId])';
GO

-- El total de una venta se obtiene con SUM(subtotal) de su detalleVenta.
-- Al registrar una venta, el backend debe insertar su detalle y descontar
-- existencias en una misma transaccion, comprobando que haya stock suficiente.
