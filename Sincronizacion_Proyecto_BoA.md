# Sincronización del Proyecto: Pasarela de Pagos BoA

Este documento establece la alineación entre la arquitectura descrita en el Documento de Ingeniería Final y la implementación real del código fuente en el espacio de trabajo.

## 1. Resumen Arquitectónico

La infraestructura del proyecto está construida sobre una arquitectura de microservicios y blockchain, dividida lógicamente en cuatro capas fundamentales, tal como se especifica en el marco práctico del documento:

1. **Capa de Presentación:** Desarrollada en React.js. Se encarga de renderizar la interfaz de usuario, generar códigos QR dinámicos para el cobro exacto en dólares digitales y gestionar la conexión de autocustodia mediante billeteras Web3.
2. **Capa de Aplicación:** Construida sobre Node.js y Express.js. Actúa como orquestador asíncrono. Utiliza librerías especializadas para escuchar los eventos de la red mediante protocolos RPC y expone una interfaz de comunicación hacia el sistema central de reservas de Boliviana de Aviación.
3. **Capa Blockchain:** Operando en la red Polygon Amoy, contiene el contrato inteligente desarrollado en Solidity que ejecuta la lógica inmutable de verificación de montos y emite los eventos de pago confirmado.
4. **Capa de Persistencia:** Implementada en PostgreSQL, encargada de almacenar las transacciones con propiedades de atomicidad, asegurando la consistencia y el registro de auditoría en las tablas correspondientes.

## 2. Alcances y Limitaciones Técnicas

El desarrollo del proyecto contempla una delimitación precisa en su diseño y despliegue tecnológico:

* **Alcance Operativo:** El proyecto opera exclusivamente como un módulo de cobro complementario integrado al ecosistema transaccional de la aerolínea. El sistema procesa la liquidación en activos virtuales estables de forma paralela y sin alterar las funciones del motor de reservas principal.
* **Limitaciones Estructurales:** La gestión de la red blockchain se enfoca netamente en la interacción con el contrato inteligente para procesar el pago. El alcance de esta plataforma se enmarca en la validación de transacciones desde la billetera del usuario hacia la billetera fría institucional. El sistema no incluye funciones de pasarela fiduciaria tradicional, consolidándose únicamente como un puente descentralizado con criptoactivos.
* **Control de Fechas:** Todo módulo de generación de datos, incluyendo los reportes financieros del sistema, exige de forma obligatoria la especificación clara de las fechas de inicio y fin. Esto asegura que todos los reportes del sistema delimiten con exactitud los periodos exactos evaluados para auditorías contables.

## 3. Interacción Criptográfica y Firma Digital

Para asegurar la validez técnica documentada, se detalla el proceso de autorización y despliegue dentro del ecosistema descentralizado:

* **Despliegue de USDT y Smart Contract:** El sistema interactúa de manera directa con el token USDT desplegado en la red Polygon. El contrato inteligente principal de la pasarela aprovecha este despliegue nativo para verificar matemáticamente la equivalencia de los pagos recibidos frente al saldo adeudado por el pasajero, manteniendo siempre la paridad estable.
* **Firma Criptográfica secp256k1:** Al momento de concretar la reserva, la red exige una autorización explícita y segura. El usuario interactúa con su Billetera Web3 instalada en el navegador, la cual aplica el algoritmo de firma digital secp256k1 utilizando la llave privada del cliente. Este proceso firma la transacción matemáticamente antes de inyectarla a la red blockchain, certificando de manera irrefutable la identidad del propietario de los fondos y autorizando el cobro exacto.

## 4. Estado de Sincronización

La siguiente lista valida la correspondencia técnica entre los componentes descritos en el documento teórico y el código fuente desplegado en el entorno de desarrollo:

* **Red Blockchain:** Especificada como Polygon Amoy. Configurada correctamente en los archivos del entorno para la conexión respectiva. Completamente sincronizado.
* **Smart Contract:** Especificado en lenguaje Solidity con autocustodia. Archivos de contratos programados exitosamente e integrados al flujo. Completamente sincronizado.
* **Orquestador Backend:** Especificado en Node.js y Express.js. Servidor estructurado operando rutas y comunicación de eventos en tiempo real. Completamente sincronizado.
* **Base de Datos:** Especificada como PostgreSQL. Esquemas relacionales y de auditoría definidos correctamente. Completamente sincronizado.
* **Frontend y UI:** Especificado en React.js con integración MetaMask. Componentes visuales y módulos criptográficos construidos. Completamente sincronizado.
* **Reportes y Fechas:** Especificado para mostrar periodos exactos. Módulos visuales programados para incluir fechas de inicio y fin obligatoriamente. Completamente sincronizado.

## 5. Inventario de Componentes

A continuación, se listan los archivos estructurales del espacio de trabajo y su función exacta dentro de la arquitectura validada:

* **01_blockchain_smart_contracts:** Contiene el contrato inteligente principal que recibe USDT, verifica la tarifa exacta y emite el evento correspondiente. También incluye el token simulado para pruebas y los archivos de configuración de despliegue hacia Polygon.
* **02_middleware_backend:** Aloja el servidor Express, las rutas de la interfaz de programación, la conexión a la base de datos PostgreSQL, la suscripción a eventos de la red mediante librerías Web3 y las configuraciones para pruebas de estrés.
* **03_frontend_dapp:** Centraliza la aplicación en React.js. Incluye el módulo de cobro que genera el código QR, gestiona la billetera Web3, simula el motor de reservas y provee un visor administrativo de transacciones.

## 6. Auditoría de Coherencia y Recomendaciones

Tras el escaneo del repositorio y la contrastación exhaustiva con los lineamientos del documento final, se certifica que existe una coherencia técnica total entre el marco práctico diseñado y la implementación programada.

* **Persistencia de Sesión:** El entorno de usuario utiliza el almacenamiento de sesión de manera apropiada para retener el estado transaccional, obligando verificaciones seguras del lado del servidor.
* **Manejo de Vocabulario:** Las interfaces cumplen rigurosamente con la política de comunicación descriptiva, adaptándose a los estándares de experiencia corporativa de la institución.
* **Pruebas y Reportes:** Las evaluaciones de rendimiento generan entregables donde se muestran visiblemente las fechas de inicio y fin de la evaluación, cumpliendo con los estándares de control temporal requeridos por el tribunal.

**Recomendación a Futuro:**
Para un paso a producción real, se sugiere migrar las llaves privadas actualmente almacenadas en variables locales hacia un gestor de secretos en la nube, añadiendo una capa de seguridad criptográfica adicional al entorno operativo.
