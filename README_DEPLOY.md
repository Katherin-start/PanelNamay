# Despliegue

## Backend en Render
1. Crea un nuevo Web Service en Render.
2. Conecta este repositorio.
3. Usa la carpeta backend como raíz del servicio.
4. Build Command: npm install
5. Start Command: node src/index.js
6. Agrega estas variables de entorno:
   - NODE_ENV=production
   - PORT=10000
   - NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   - SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   - SUPABASE_ANON_KEY=tu-anon-key
   - JWT_SECRET=un-secreto-fuerte

## Frontend en Vercel
1. Crea un nuevo proyecto en Vercel.
2. Conecta este repositorio.
3. Usa la carpeta frontend como raíz del proyecto.
4. Build Command: npm run build
5. Output Directory: .next
6. Agrega estas variables de entorno:
   - NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   - NEXT_PUBLIC_API_URL=https://tu-backend-en-render.onrender.com/api
