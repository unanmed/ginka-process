import { Modal } from 'ant-design-vue';
import EventEmitter from 'eventemitter3';

interface FolderHandlerEvent {
    update: [];
}

export class FolderHandler extends EventEmitter<FolderHandlerEvent> {
    folders: Set<FileSystemDirectoryHandle> = new Set();

    async choose() {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            await handle.requestPermission({ mode: 'readwrite' });
        }
        const hasSame = (
            await Promise.all([...this.folders].map(v => v.isSameEntry(handle)))
        ).includes(true);
        if (hasSame) {
            await new Promise<void>(res => {
                Modal.info({
                    content: '这个文件夹似乎已经打开过了，请重新选择。',
                    title: '文件夹重复',
                    onOk() {
                        res();
                    }
                });
            });
            return;
        }
        this.folders.add(handle);
        this.emit('update');
        return handle;
    }

    remove(handle: FileSystemDirectoryHandle) {
        const success = this.folders.delete(handle);
        this.emit('update');
        return success;
    }
}

interface SingleFolderHandlerEvent {
    update: [];
}

export class SingleFolderHandler extends EventEmitter<SingleFolderHandlerEvent> {
    folder?: FileSystemDirectoryHandle;

    async choose(): Promise<FileSystemDirectoryHandle> {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            await handle.requestPermission({ mode: 'readwrite' });
        }
        this.folder = handle;
        this.emit('update');
        return handle;
    }
}
