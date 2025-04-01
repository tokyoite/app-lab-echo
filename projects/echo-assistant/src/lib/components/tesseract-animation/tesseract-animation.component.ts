// projects/echo-assistant/src/lib/components/tesseract-animation/tesseract-animation.component.ts

import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'echo-tesseract-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tesseract-container">
      <canvas #tesseractCanvas width="150" height="150"></canvas>
    </div>
  `,
  styles: [
    `
      .tesseract-container {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 20px 0;
      }

      canvas {
        width: 150px;
        height: 150px;
        border-radius: 10px;
        background: #121212;
      }
    `,
  ],
})
export class TesseractAnimationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('tesseractCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private vertices4D: number[][] = [];
  private edges: number[][] = [];
  private animationId?: number;
  private angle4D = 0;
  private angle3D = 0;

  ngAfterViewInit(): void {
    this.initTesseract();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private initTesseract(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    this.ctx = ctx;

    // Define tesseract vertices in 4D space
    for (let x = -0.5; x <= 0.5; x += 1) {
      for (let y = -0.5; y <= 0.5; y += 1) {
        for (let z = -0.5; z <= 0.5; z += 1) {
          for (let w = -0.5; w <= 0.5; w += 1) {
            this.vertices4D.push([x, y, z, w]);
          }
        }
      }
    }

    // Define edges by connecting vertices that differ in exactly one coordinate
    for (let i = 0; i < this.vertices4D.length; i++) {
      for (let j = i + 1; j < this.vertices4D.length; j++) {
        let diffCount = 0;
        for (let k = 0; k < 4; k++) {
          if (this.vertices4D[i][k] !== this.vertices4D[j][k]) {
            diffCount++;
          }
        }
        if (diffCount === 1) {
          this.edges.push([i, j]);
        }
      }
    }

    this.animate();
  }

  private projectTo3D(vertex4D: number[], depth: number): number[] {
    // Rotate in 4D (in three planes)
    const w = vertex4D[3];
    const x = vertex4D[0];
    const y = vertex4D[1];
    const z = vertex4D[2];

    // XW rotation
    const xw = Math.cos(this.angle4D) * x - Math.sin(this.angle4D) * w;
    const wx = Math.sin(this.angle4D) * x + Math.cos(this.angle4D) * w;

    // YW rotation
    const yw =
      Math.cos(this.angle4D * 0.7) * y - Math.sin(this.angle4D * 0.7) * wx;
    const wy =
      Math.sin(this.angle4D * 0.7) * y + Math.cos(this.angle4D * 0.7) * wx;

    // ZW rotation
    const zw =
      Math.cos(this.angle4D * 0.5) * z - Math.sin(this.angle4D * 0.5) * wy;
    const wz =
      Math.sin(this.angle4D * 0.5) * z + Math.cos(this.angle4D * 0.5) * wy;

    // Project from 4D to 3D
    const scale = 1.2 / (1.2 + wz);
    return [xw * scale, yw * scale, zw * scale];
  }

  private projectTo2D(vertex3D: number[]): number[] {
    // Rotate in 3D
    const x = vertex3D[0];
    const y = vertex3D[1];
    const z = vertex3D[2];

    // X rotation
    const yx =
      Math.cos(this.angle3D * 0.9) * y - Math.sin(this.angle3D * 0.9) * z;
    const zx =
      Math.sin(this.angle3D * 0.9) * y + Math.cos(this.angle3D * 0.9) * z;

    // Y rotation
    const xy = Math.cos(this.angle3D) * x - Math.sin(this.angle3D) * zx;
    const zy = Math.sin(this.angle3D) * x + Math.cos(this.angle3D) * zx;

    // Z rotation
    const xz =
      Math.cos(this.angle3D * 1.1) * xy - Math.sin(this.angle3D * 1.1) * yx;
    const yz =
      Math.sin(this.angle3D * 1.1) * xy + Math.cos(this.angle3D * 1.1) * yx;

    // Project to 2D screen with scaling
    const canvas = this.canvasRef.nativeElement;
    const scale = 75;
    return [xz * scale + canvas.width / 2, yz * scale + canvas.height / 2];
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const canvas = this.canvasRef.nativeElement;

    // Clear canvas
    this.ctx.fillStyle = '#121212';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update angles
    const speed = 0.01;
    this.angle4D += speed;
    this.angle3D += speed * 0.7;

    // Project vertices
    const vertices3D = this.vertices4D.map((v) => this.projectTo3D(v, 1.2));
    const vertices2D = vertices3D.map((v) => this.projectTo2D(v));

    // Inner cube edges - blue color
    const innerEdges = this.edges.filter((edge) => {
      return this.vertices4D[edge[0]][3] < 0 && this.vertices4D[edge[1]][3] < 0;
    });

    // Outer cube edges - cyan color
    const outerEdges = this.edges.filter((edge) => {
      return this.vertices4D[edge[0]][3] > 0 && this.vertices4D[edge[1]][3] > 0;
    });

    // Connecting edges between inner and outer cubes - white color
    const connectingEdges = this.edges.filter((edge) => {
      return this.vertices4D[edge[0]][3] !== this.vertices4D[edge[1]][3];
    });

    // Draw inner cube edges
    this.ctx.strokeStyle = 'rgba(108, 92, 231, 0.8)';
    this.ctx.lineWidth = 1.5;
    innerEdges.forEach((edge) => {
      this.ctx.beginPath();
      this.ctx.moveTo(vertices2D[edge[0]][0], vertices2D[edge[0]][1]);
      this.ctx.lineTo(vertices2D[edge[1]][0], vertices2D[edge[1]][1]);
      this.ctx.stroke();
    });

    // Draw outer cube edges
    this.ctx.strokeStyle = 'rgba(0, 206, 255, 0.8)';
    this.ctx.lineWidth = 1.5;
    outerEdges.forEach((edge) => {
      this.ctx.beginPath();
      this.ctx.moveTo(vertices2D[edge[0]][0], vertices2D[edge[0]][1]);
      this.ctx.lineTo(vertices2D[edge[1]][0], vertices2D[edge[1]][1]);
      this.ctx.stroke();
    });

    // Draw connecting edges
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    connectingEdges.forEach((edge) => {
      this.ctx.beginPath();
      this.ctx.moveTo(vertices2D[edge[0]][0], vertices2D[edge[0]][1]);
      this.ctx.lineTo(vertices2D[edge[1]][0], vertices2D[edge[1]][1]);
      this.ctx.stroke();
    });

    // Draw vertices
    vertices2D.forEach((vertex, i) => {
      const w = this.vertices4D[i][3];
      const z = vertices3D[i][2];

      // Different colors for inner and outer cube vertices
      if (w < 0) {
        this.ctx.fillStyle = 'rgb(108, 92, 231)';
      } else {
        this.ctx.fillStyle = 'rgb(0, 206, 255)';
      }

      // Size calculation
      const size = Math.max(1.5, 2 + (z + 0.5));

      this.ctx.beginPath();
      this.ctx.arc(vertex[0], vertex[1], size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
}
