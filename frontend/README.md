# Panel de Administración Dental - Frontend

Este es el frontend del sistema de administración dental construido con Next.js 14, TypeScript y Tailwind CSS.

## Estructura del Proyecto

```
frontend/
├── app/                          # App Router de Next.js
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── layout.tsx            # Layout para páginas de auth
│   │   └── login/                # Página de login
│   │       └── page.tsx
│   ├── (dashboard)/              # Grupo de rutas del dashboard
│   │   ├── layout.tsx            # Layout del dashboard con sidebar
│   │   ├── dashboard/            # Página principal del dashboard
│   │   │   └── page.tsx
│   │   ├── pacientes/            # Gestión de pacientes
│   │   │   └── page.tsx
│   │   ├── citas/                # Gestión de citas
│   │   │   └── page.tsx
│   │   ├── pagos/                # Gestión de pagos
│   │   │   └── page.tsx
│   │   ├── reportes/             # Reportes y estadísticas
│   │   │   └── page.tsx
│   │   ├── chat/                 # Sistema de chat
│   │   │   └── page.tsx
│   │   └── usuarios/             # Gestión de usuarios
│   │       └── page.tsx
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout raíz
│   └── page.tsx                  # Página de inicio
├── components/                   # Componentes reutilizables
│   ├── ui/                       # Componentes de UI básicos
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/                   # Componentes de layout
│   │   └── DashboardLayout.tsx   # Layout principal del dashboard
│   ├── auth/                     # Componentes de autenticación
│   │   └── LoginForm.tsx
│   ├── dashboard/                # Componentes del dashboard
│   │   └── DashboardOverview.tsx
│   ├── patients/                 # Componentes de pacientes
│   │   └── PatientsPage.tsx
│   ├── appointments/             # Componentes de citas
│   │   └── AppointmentsPage.tsx
│   ├── payments/                 # Componentes de pagos
│   │   └── PaymentsPage.tsx
│   ├── reports/                  # Componentes de reportes
│   │   └── ReportsPage.tsx
│   ├── chat/                     # Componentes de chat
│   │   └── ChatPage.tsx
│   └── users/                    # Componentes de usuarios
│       └── UsersPage.tsx
├── lib/                          # Utilidades y configuraciones
│   ├── api.ts                    # Cliente API
│   └── utils.ts                  # Funciones utilitarias
├── types/                        # Definiciones TypeScript
│   └── index.ts
├── hooks/                        # Custom hooks
├── styles/                       # Estilos adicionales
└── public/                       # Archivos estáticos
```

## Tecnologías Utilizadas

- **Next.js 14**: Framework React con App Router
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Framework de estilos
- **Heroicons**: Iconos SVG
- **React Hook Form**: Manejo de formularios
- **Zod**: Validación de esquemas
- **Supabase**: Base de datos y autenticación
- **Socket.io**: Comunicación en tiempo real

## Instalación y Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

## Estructura de Rutas

### Rutas Públicas
- `/` - Página de inicio (redirige a login si no autenticado)
- `/login` - Página de login

### Rutas Protegidas (Dashboard)
- `/dashboard` - Vista general del sistema
- `/pacientes` - Gestión de pacientes
- `/citas` - Gestión de citas médicas
- `/pagos` - Gestión de pagos y facturación
- `/reportes` - Generación de reportes
- `/chat` - Sistema de mensajería
- `/usuarios` - Gestión de usuarios del sistema

## Componentes Principales

### Layout Components
- `DashboardLayout`: Layout principal con sidebar responsive y navegación
- Maneja autenticación, navegación y estado del usuario

### Page Components
- `DashboardOverview`: Vista general con métricas y estadísticas
- `PatientsPage`: Gestión de pacientes con lista y acciones
- `AppointmentsPage`: Gestión de citas médicas
- `PaymentsPage`: Gestión de pagos y facturación
- `ReportsPage`: Generación y descarga de reportes
- `ChatPage`: Sistema de chat en tiempo real
- `UsersPage`: Gestión de usuarios del sistema

### UI Components
- Componentes básicos de UI construidos con Tailwind CSS
- Botones, tarjetas, formularios, inputs, etc.

## API Integration

El cliente API (`lib/api.ts`) maneja todas las comunicaciones con el backend:

- Autenticación (login, logout, perfil)
- Dashboard (métricas, notificaciones)
- Pacientes (CRUD operations)
- Citas (CRUD operations)
- Pagos (CRUD operations)
- Reportes (generación y descarga)
- Chat (mensajes, contactos)
- Usuarios (CRUD operations)

## Estado y Gestión de Datos

- **Autenticación**: Token JWT almacenado en localStorage
- **Estado Global**: Context API para estado de usuario
- **API Calls**: Cliente centralizado con manejo de errores
- **Formularios**: React Hook Form con validación Zod

## Estilos y Tema

- **Tailwind CSS**: Framework de estilos utilitario
- **Tema Personalizado**: Colores y componentes consistentes
- **Responsive Design**: Diseño adaptativo para móvil y desktop
- **Dark Mode**: Soporte para tema oscuro (futuro)

## Próximos Pasos

1. Implementar lógica de negocio completa en cada componente
2. Agregar formularios para crear/editar entidades
3. Implementar funcionalidades de búsqueda y filtrado
4. Agregar notificaciones en tiempo real
5. Implementar tema oscuro
6. Agregar tests unitarios e integración