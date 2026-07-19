import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateBotDto {
  @IsUUID()
  workspaceId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['ar', 'en'])
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fallbackMessage?: string;
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  /** Set to null to detach the knowledge base. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  knowledgeBaseId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['ar', 'en'])
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fallbackMessage?: string;
}
