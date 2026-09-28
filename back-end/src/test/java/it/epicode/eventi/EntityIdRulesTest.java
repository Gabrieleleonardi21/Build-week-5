package it.epicode.eventi;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.util.ClassUtils;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regola del team sugli id (D02): l'UUID lo genera Hibernate, quindi in ogni @Entity
 * deve essere private, senza setter e mai passato a un costruttore.
 * Scansiona tutte le entity del progetto: vale anche per quelle aggiunte in futuro.
 * Non usa il database, quindi gira sempre (anche senza Docker).
 */
class EntityIdRulesTest {

	private static List<Class<?>> entities;

	@BeforeAll
	static void findEntities() {
		ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
		scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
		entities = new ArrayList<>();
		for (BeanDefinition bd : scanner.findCandidateComponents("it.epicode.eventi")) {
			entities.add(ClassUtils.resolveClassName(bd.getBeanClassName(), null));
		}
	}

	@Test
	void entities_areFound() {
		// Protegge dal falso verde: se la scansione non trova nulla, gli altri test passerebbero a vuoto.
		assertThat(entities).isNotEmpty();
	}

	@Test
	void id_isPrivateUuidGeneratedByHibernate() {
		List<String> violations = new ArrayList<>();
		for (Class<?> entity : entities) {
			Field id = idField(entity);
			if (id == null) {
				violations.add(entity.getSimpleName() + ": manca il campo @Id");
				continue;
			}
			if (!Modifier.isPrivate(id.getModifiers())) {
				violations.add(entity.getSimpleName() + ": l'id deve essere private");
			}
			if (id.getType() != UUID.class) {
				violations.add(entity.getSimpleName() + ": l'id deve essere UUID");
			}
			GeneratedValue generated = id.getAnnotation(GeneratedValue.class);
			if (generated == null || generated.strategy() != GenerationType.UUID) {
				violations.add(entity.getSimpleName() + ": manca @GeneratedValue(strategy = GenerationType.UUID)");
			}
		}
		assertThat(violations).isEmpty();
	}

	@Test
	void id_hasNoSetter() {
		List<String> violations = new ArrayList<>();
		for (Class<?> entity : entities) {
			for (Method method : entity.getDeclaredMethods()) {
				if (method.getName().equals("setId")) {
					violations.add(entity.getSimpleName() + ": setId non ammesso, l'id lo genera Hibernate");
				}
			}
		}
		assertThat(violations).isEmpty();
	}

	@Test
	void constructors_neverReceiveUuid() {
		List<String> violations = new ArrayList<>();
		for (Class<?> entity : entities) {
			for (Constructor<?> ctor : entity.getDeclaredConstructors()) {
				if (Arrays.asList(ctor.getParameterTypes()).contains(UUID.class)) {
					violations.add(entity.getSimpleName() + ": costruttore con parametro UUID");
				}
			}
		}
		assertThat(violations).isEmpty();
	}

	@Test
	void noArgConstructor_isProtected() {
		List<String> violations = new ArrayList<>();
		for (Class<?> entity : entities) {
			try {
				Constructor<?> ctor = entity.getDeclaredConstructor();
				if (!Modifier.isProtected(ctor.getModifiers())) {
					violations.add(entity.getSimpleName() + ": il costruttore vuoto deve essere protected (solo per JPA)");
				}
			} catch (NoSuchMethodException ex) {
				violations.add(entity.getSimpleName() + ": manca il costruttore vuoto richiesto da JPA");
			}
		}
		assertThat(violations).isEmpty();
	}

	/** Campo annotato @Id nella classe (le entity del progetto non usano superclassi). */
	private static Field idField(Class<?> entity) {
		for (Field field : entity.getDeclaredFields()) {
			if (field.isAnnotationPresent(Id.class)) {
				return field;
			}
		}
		return null;
	}
}
