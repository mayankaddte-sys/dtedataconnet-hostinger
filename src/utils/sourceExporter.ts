import JSZip from 'jszip';

// Eagerly bundle project files as raw text using Vite's import.meta.glob
const sourceFiles: Record<string, string> = (import.meta as any).glob(
  [
    '/src/**/*.{ts,tsx,css,json}',
    '/index.html',
    '/package.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/metadata.json',
    '/.env.example',
    '/.gitignore',
    '/README.md'
  ],
  { query: '?raw', import: 'default', eager: true }
);

export async function generateAndDownloadProjectZip(
  onProgress?: (percent: number, currentFile: string) => void
): Promise<void> {
  const zip = new JSZip();

  const fileEntries = Object.entries(sourceFiles);
  const total = fileEntries.length;

  fileEntries.forEach(([path, content], index) => {
    // Remove leading slash for standard zip directory structure
    const relativePath = path.startsWith('/') ? path.substring(1) : path;
    
    // Skip large generated files or self
    if (relativePath.endsWith('.zip') || relativePath.includes('node_modules')) {
      return;
    }

    if (onProgress) {
      onProgress(Math.round(((index + 1) / total) * 70), relativePath);
    }

    zip.file(relativePath, content as string);
  });

  // Ensure README.md is always present and informative
  if (!zip.file('README.md')) {
    zip.file(
      'README.md',
      `# Uttar Pradesh DTE - Field Units Data Portal
## Directorate of Training and Employment, UP

### Local Setup
1. Run \`npm install\`
2. Run \`npm run dev\`
3. Build with \`npm run build\`
`
    );
  }

  // Generate ZIP Blob
  const blob = await zip.generateAsync(
    { 
      type: 'blob', 
      compression: 'DEFLATE',
      compressionOptions: { level: 6 } 
    },
    (metadata) => {
      if (onProgress) {
        onProgress(70 + Math.round((metadata.percent / 100) * 30), 'Compressing ZIP...');
      }
    }
  );

  // Trigger client-side direct download
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `dte-portal-source-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 3000);
}
