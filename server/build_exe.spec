# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec file for DeepSeek Knowledge Base single EXE."""

import os
import sys
from pathlib import Path

block_cipher = None

# Paths
server_dir = os.path.abspath(SPECPATH)
web_out_dir = os.path.join(server_dir, 'web', 'out')

a = Analysis(
    [os.path.join(server_dir, 'main.py')],
    pathex=[server_dir],
    binaries=[],
    datas=[
        # Next.js static export
        (web_out_dir, 'static'),
        # .env example template
        (os.path.join(server_dir, '.env.example'), '.'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'python_multipart',
        'chromadb',
        'chromadb.api',
        'chromadb.db',
        'chromadb.db.impl',
        'chromadb.db.impl.sqlite',
        'chromadb.segment',
        'chromadb.segment.impl',
        'chromadb.segment.impl.metadata',
        'chromadb.segment.impl.vector',
        'hnswlib',
        'onnxruntime',
        'sqlalchemy.dialects.sqlite',
        'pymupdf',
        'fitz',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude heavy ML dependencies to keep EXE small
        'torch',
        'torchvision',
        'torchaudio',
        'sentence_transformers',
        'transformers',
        'tokenizers',
        'streamlit',
        # Exclude unused packages
        'matplotlib',
        'pandas',
        'scipy',
        'sklearn',
        'PIL',
        'cv2',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='DeepseekKnowledgeBase',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Show console for logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path here if available
)
