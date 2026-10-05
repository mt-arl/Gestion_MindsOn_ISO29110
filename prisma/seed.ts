import { 
  PrismaClient, 
  AdminRole, 
  StudentStatus, 
  ClassModality, 
  TuitionFeeStatus, 
  CourseLevel, 
  CourseBook, 
  PrivateClassStatus 
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando script de semilla (Seeding MindsOn database)...');

  // Limpieza previa para garantizar idempotencia en desarrollo
  await prisma.payment.deleteMany();
  await prisma.tuitionFee.deleteMany();
  await prisma.privateClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.adminUser.deleteMany();

  // 1. Crear Usuario Administrador
  console.log('👤 Creando usuario administrador...');
  const admin = await prisma.adminUser.create({
    data: {
      name: 'Administrador Principal MindsOn',
      email: 'admin@mindson.edu',
      passwordHash: '$2a$12$e8Yy8fQO3z2R7bYpM9u0ZeC4b7qH9iN1GvU3sF6wX1a2b3c4d5e6f',
      role: AdminRole.SUPERADMIN,
    },
  });
  console.log(`✅ Admin creado: ${admin.email} (${admin.role})`);

  // 2. Crear Aulas Predeterminadas
  console.log('🏢 Creando aulas predeterminadas...');
  const classroomBrazil = await prisma.classroom.create({
    data: {
      id: 'cld_brazil_001',
      name: 'Aula BRAZIL',
      capacity: 15,
      location: 'Planta Principal',
      isVirtual: false,
      isActive: true,
    },
  });

  const classroomJapan = await prisma.classroom.create({
    data: {
      id: 'cld_japan_002',
      name: 'Aula JAPAN',
      capacity: 15,
      location: 'Planta Principal',
      isVirtual: false,
      isActive: true,
    },
  });

  const classroomLearningland = await prisma.classroom.create({
    data: {
      id: 'cld_learningland_003',
      name: 'Aula LEARNINGLAND',
      capacity: 15,
      location: 'Planta Principal',
      isVirtual: false,
      isActive: true,
    },
  });

  const classroomVirtual = await prisma.classroom.create({
    data: {
      id: 'cld_virtual_004',
      name: 'Aula VIRTUAL',
      capacity: 50,
      location: 'Zoom Institucional',
      isVirtual: true,
      isActive: true,
    },
  });
  console.log('✅ 4 Aulas creadas: Brazil, Japan, Learningland y Virtual');

  // 3. Crear Profesores
  console.log('👨‍🏫 Creando profesores...');
  const teacher1 = await prisma.teacher.create({
    data: {
      ci: '10293847',
      firstName: 'Roberto',
      lastName: 'Gómez Alarcón',
      email: 'roberto.gomez@mindson.edu',
      phone: '+591 71234567',
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      ci: '84736291',
      firstName: 'Diana',
      lastName: 'Mendoza Castillo',
      email: 'diana.mendoza@mindson.edu',
      phone: '+591 79876543',
    },
  });

  const teacher3 = await prisma.teacher.create({
    data: {
      ci: '49382019',
      firstName: 'Carlos',
      lastName: 'Vargas Silva',
      email: 'carlos.vargas@mindson.edu',
      phone: '+591 75551234',
    },
  });
  console.log(`✅ 3 Profesores creados: ${teacher1.firstName}, ${teacher2.firstName} y ${teacher3.firstName}`);

  // 4. Crear Clases con Niveles, Libros, Aulas y Horarios Duales
  console.log('📚 Creando clases...');
  
  // Clase 1: Intro A - Libro Amarillo - Presencial (Aula Brazil)
  const introAClass = await prisma.class.create({
    data: {
      code: 'ENG-INTRO-A1',
      name: 'Intro A - Fundamentos Iniciales',
      level: CourseLevel.INTRO_A,
      book: CourseBook.AMARILLO,
      modality: ClassModality.PRESENCIAL,
      classroomId: classroomBrazil.id,
      unitSchedule: 'Lunes y Miércoles 17:00 - 18:30 (Aula Brazil)',
      speakingSchedule: 'Viernes 17:00 - 18:30 (Virtual Zoom)',
      unitTeacherId: teacher1.id,
      speakingTeacherId: teacher2.id,
    },
  });

  // Clase 2: L1A - Libro Rojo - Presencial (Aula Japan)
  const l1aClass = await prisma.class.create({
    data: {
      code: 'ENG-L1A-01',
      name: 'Level 1A - Intermedio Bajo',
      level: CourseLevel.L1A,
      book: CourseBook.ROJO,
      modality: ClassModality.PRESENCIAL,
      classroomId: classroomJapan.id,
      unitSchedule: 'Martes y Jueves 18:30 - 20:00 (Aula Japan)',
      speakingSchedule: 'Sábado 10:00 - 11:30 (Virtual Zoom)',
      unitTeacherId: teacher2.id,
      speakingTeacherId: teacher3.id,
    },
  });

  // Clase 3: L2B - Libro Azul - Virtual (Aula Virtual)
  const l2bClass = await prisma.class.create({
    data: {
      code: 'ENG-L2B-01',
      name: 'Level 2B - Avanzado y Fluidez',
      level: CourseLevel.L2B,
      book: CourseBook.AZUL,
      modality: ClassModality.VIRTUAL,
      classroomId: classroomVirtual.id,
      unitSchedule: 'Lunes y Miércoles 19:00 - 20:30 (Online)',
      speakingSchedule: 'Jueves 19:00 - 20:30 (Speaking Club)',
      unitTeacherId: teacher3.id,
      speakingTeacherId: teacher1.id,
    },
  });
  console.log(`✅ Clases creadas: ${introAClass.code} (Amarillo), ${l1aClass.code} (Rojo) y ${l2bClass.code} (Azul)`);

  // Configuración de fechas dinámicas
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const futureDueDate = new Date(currentYear, currentMonth - 1, 25, 23, 59, 59);
  const pastDueDate = new Date(currentYear, currentMonth - 2, 5, 23, 59, 59);

  // 5. Crear Estudiantes y Mensualidades (TuitionFees)
  console.log('🎓 Creando estudiantes...');

  // Estudiante 1: Al día (PAID) en Intro A
  const student1 = await prisma.student.create({
    data: {
      ci: '1728394051',
      firstName: 'Mateo',
      lastName: 'Fernández Morales',
      email: 'mateo.fernandez@gmail.com',
      phone: '+591 70011223',
      guardianPhone1: '+591 70099887',
      age: 15,
      gender: 'Masculino',
      address: 'Av. Las Palmas #450',
      status: StudentStatus.ACTIVE,
      monthlyFee: 65.00,
      currentClassId: introAClass.id,
    },
  });

  const fee1 = await prisma.tuitionFee.create({
    data: {
      studentId: student1.id,
      classId: introAClass.id,
      month: currentMonth,
      year: currentYear,
      dueDate: futureDueDate,
      amount: student1.monthlyFee,
      status: TuitionFeeStatus.PAID,
    },
  });

  await prisma.payment.create({
    data: {
      tuitionFeeId: fee1.id,
      amountPaid: 65.00,
      paymentDate: new Date(),
      registeredBy: 'Admin Principal',
      notes: '[Transferencia Bancaria / QR] Pago mensualidad completo Banco Mercantil',
    },
  });
  console.log(`✅ Estudiante 1: ${student1.firstName} ${student1.lastName} -> Intro A ($${student1.monthlyFee}) [PAID].`);

  // Estudiante 2: Pendiente (PENDING) en L1A
  const student2 = await prisma.student.create({
    data: {
      ci: '1839201948',
      firstName: 'Valentina',
      lastName: 'Paz Soldán',
      email: 'valentina.paz@gmail.com',
      phone: '+591 71122334',
      guardianPhone1: '+591 71188990',
      age: 17,
      gender: 'Femenino',
      address: 'Calle Los Sauces #12',
      status: StudentStatus.ACTIVE,
      monthlyFee: 70.00,
      currentClassId: l1aClass.id,
    },
  });

  await prisma.tuitionFee.create({
    data: {
      studentId: student2.id,
      classId: l1aClass.id,
      month: currentMonth,
      year: currentYear,
      dueDate: futureDueDate,
      amount: student2.monthlyFee,
      status: TuitionFeeStatus.PENDING,
    },
  });
  console.log(`✅ Estudiante 2: ${student2.firstName} ${student2.lastName} -> L1A ($${student2.monthlyFee}) [PENDING].`);

  // Estudiante 3: En Mora (OVERDUE) en L2B
  const student3 = await prisma.student.create({
    data: {
      ci: '1948302910',
      firstName: 'Sebastián',
      lastName: 'Rios Camacho',
      email: 'sebastian.rios@gmail.com',
      phone: '+591 72233445',
      guardianPhone1: '+591 72277889',
      age: 19,
      gender: 'Masculino',
      address: 'Barrio Equipetrol Calle 7',
      status: StudentStatus.ACTIVE,
      monthlyFee: 75.00,
      currentClassId: l2bClass.id,
    },
  });

  await prisma.tuitionFee.create({
    data: {
      studentId: student3.id,
      classId: l2bClass.id,
      month: currentMonth === 1 ? 12 : currentMonth - 1,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
      dueDate: pastDueDate,
      amount: student3.monthlyFee,
      status: TuitionFeeStatus.OVERDUE,
    },
  });
  console.log(`✅ Estudiante 3: ${student3.firstName} ${student3.lastName} -> L2B ($${student3.monthlyFee}) [OVERDUE].`);

  // 6. Crear Clases Privadas de prueba
  console.log('📌 Creando clases privadas de prueba...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const privateClass1 = await prisma.privateClass.create({
    data: {
      studentName: 'Camila Vargas',
      studentId: null,
      teacherId: teacher1.id,
      date: tomorrow,
      startTime: '15:00',
      endTime: '16:30',
      classroomId: classroomBrazil.id,
      topic: 'Preparación intensiva examen TOEFL / Speaking practice',
      chargeAmount: 30.00,
      status: PrivateClassStatus.PROGRAMADA,
    },
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 3);

  const privateClass2 = await prisma.privateClass.create({
    data: {
      studentName: `${student2.firstName} ${student2.lastName}`,
      studentId: student2.id,
      teacherId: teacher2.id,
      date: nextWeek,
      startTime: '16:00',
      endTime: '17:00',
      classroomId: classroomLearningland.id,
      topic: 'Nivelación gramatical Unit 4 (Passive Voice)',
      chargeAmount: 20.00,
      status: PrivateClassStatus.PROGRAMADA,
    },
  });

  console.log(`✅ 2 Clases privadas creadas para ${privateClass1.studentName} y ${privateClass2.studentName}`);

  console.log('✨ Base de datos sembrada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando la semilla:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
